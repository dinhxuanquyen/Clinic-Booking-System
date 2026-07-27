import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../../..');
const uploadsRoot = path.join(projectRoot, 'backend', 'uploads');
const clinicsAssetsRoot = path.join(projectRoot, 'frontend', 'public', 'static-assets', 'clinics');
const doctorsAssetsRoot = path.join(projectRoot, 'frontend', 'public', 'static-assets', 'doctors');

function normalizeFileName(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const stem = path.basename(fileName, path.extname(fileName))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '') || 'image';

  return `${stem}${extension}`;
}

function getUploadRelativePath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const trimmed = value.trim();
  if (trimmed.startsWith('/static-assets/')) return null;

  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    if (!/^localhost$/i.test(parsed.hostname) || !parsed.pathname.startsWith('/uploads/')) return null;
    pathname = parsed.pathname;
  }

  if (pathname.startsWith('/uploads/')) pathname = pathname.slice('/uploads/'.length);
  else if (pathname.startsWith('uploads/')) pathname = pathname.slice('uploads/'.length);
  else return null;

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relativePath = path.normalize(decodedPathname.replace(/\//g, path.sep));
  if (!relativePath || relativePath === '.' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return relativePath;
}

function findSourceFile(relativePath) {
  const sourcePath = path.resolve(uploadsRoot, relativePath);
  const relativeToRoot = path.relative(uploadsRoot, sourcePath);
  if (relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) return null;
  return fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile() ? sourcePath : null;
}

function contentHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').slice(0, 12);
}

function copyWithoutCollision(sourcePath, destinationRoot, originalName) {
  const normalizedName = normalizeFileName(originalName);
  let destinationName = normalizedName;
  let destinationPath = path.join(destinationRoot, destinationName);
  const sourceBuffer = fs.readFileSync(sourcePath);

  if (fs.existsSync(destinationPath)) {
    const existingBuffer = fs.readFileSync(destinationPath);
    if (!existingBuffer.equals(sourceBuffer)) {
      const extension = path.extname(normalizedName);
      const stem = path.basename(normalizedName, extension);
      destinationName = `${stem}-${contentHash(sourcePath)}${extension}`;
      destinationPath = path.join(destinationRoot, destinationName);
      if (fs.existsSync(destinationPath) && !fs.readFileSync(destinationPath).equals(sourceBuffer)) {
        throw new Error(`Destination collision for ${destinationName}`);
      }
    }
  }

  if (!fs.existsSync(destinationPath)) {
    fs.copyFileSync(sourcePath, destinationPath);
    return { destinationName, copied: true };
  }
  return { destinationName, copied: false };
}

async function migrateCollection({ model, imageField, arrayImageField, destinationRoot, label, stats }) {
  const projection = `_id ${imageField}${arrayImageField ? ` ${arrayImageField}` : ''}`;
  const documents = await model.find({}).select(projection).lean();
  stats.checked += documents.length;

  for (const document of documents) {
    const fieldsToUpdate = {};
    const migrateImage = (imagePath) => {
      const relativePath = getUploadRelativePath(imagePath);
      if (!relativePath) return imagePath;

      const sourcePath = findSourceFile(relativePath);
      if (!sourcePath) {
        stats.missing += 1;
        stats.missingFiles.push(`${label} ${document._id}: ${imagePath}`);
        return imagePath;
      }

      const result = copyWithoutCollision(sourcePath, destinationRoot, path.basename(relativePath));
      if (result.copied) stats.copied += 1;
      return `/static-assets/${label === 'Clinic' ? 'clinics' : 'doctors'}/${result.destinationName}`;
    };

    try {
      const migratedImage = migrateImage(document[imageField]);
      if (migratedImage !== document[imageField]) fieldsToUpdate[imageField] = migratedImage;

      if (arrayImageField && Array.isArray(document[arrayImageField])) {
        const migratedGallery = document[arrayImageField].map(migrateImage);
        if (migratedGallery.some((image, index) => image !== document[arrayImageField][index])) {
          fieldsToUpdate[arrayImageField] = migratedGallery;
        }
      }

      if (Object.keys(fieldsToUpdate).length) {
        await model.updateOne({ _id: document._id }, { $set: fieldsToUpdate });
        stats.updated += 1;
      }
    } catch (error) {
      stats.errors += 1;
      console.error(`Lỗi xử lý ${label} ${document._id}: ${error.message}`);
    }
  }
}

async function main() {
  fs.mkdirSync(clinicsAssetsRoot, { recursive: true });
  fs.mkdirSync(doctorsAssetsRoot, { recursive: true });
  await connectCentralDb();

  const stats = { checked: 0, copied: 0, updated: 0, missing: 0, missingFiles: [], errors: 0 };
  await migrateCollection({
    model: Clinic,
    imageField: 'image',
    arrayImageField: 'galleryImages',
    destinationRoot: clinicsAssetsRoot,
    label: 'Clinic',
    stats
  });
  const clinicsChecked = stats.checked;
  await migrateCollection({ model: Doctor, imageField: 'avatar', destinationRoot: doctorsAssetsRoot, label: 'Doctor', stats });
  const doctorsChecked = stats.checked - clinicsChecked;

  console.log(`Số cơ sở đã kiểm tra: ${clinicsChecked}`);
  console.log(`Số bác sĩ đã kiểm tra: ${doctorsChecked}`);
  console.log(`Số file ảnh đã copy: ${stats.copied}`);
  console.log(`Số document đã cập nhật: ${stats.updated}`);
  console.log(`Số file nguồn bị thiếu: ${stats.missing}`);
  console.log('Danh sách file bị thiếu:');
  if (stats.missingFiles.length) stats.missingFiles.forEach((file) => console.log(`- ${file}`));
  else console.log('- Không có');
  console.log(`Số lỗi: ${stats.errors}`);
}

main()
  .catch((error) => {
    console.error('Migration thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  });
