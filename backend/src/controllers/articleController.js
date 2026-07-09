import { body, param, query } from 'express-validator';
import Article from '../models/articleModel.js';
import Doctor from '../models/doctorModel.js';
import Specialty from '../models/specialtyModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { createAuditLog } from '../utils/auditLogger.js';

const articlePopulate = [
  { path: 'authorId', select: 'name role' },
  { path: 'doctorId', select: 'name doctorCode avatar specialtyId clinicId' },
  { path: 'specialtyId', select: 'name' }
];

export const articleIdRule = [param('id').isMongoId().withMessage('Bài viết không hợp lệ')];
export const articleSlugRule = [param('slug').trim().notEmpty().withMessage('Slug bài viết không hợp lệ')];

export const publicArticleQueryRules = [
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('specialtyId').optional({ checkFalsy: true }).isMongoId().withMessage('Chuyên khoa không hợp lệ'),
  query('tag').optional().trim(),
  query('featured').optional().isBoolean().withMessage('featured không hợp lệ'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn không hợp lệ')
];

export const articleRules = [
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('summary').optional().trim(),
  body('content').trim().notEmpty().withMessage('Nội dung là bắt buộc'),
  body('coverImage').optional().trim(),
  body('category').optional().trim(),
  body('specialtyId').optional({ checkFalsy: true }).isMongoId().withMessage('Chuyên khoa không hợp lệ'),
  body('tags').optional(),
  body('status').optional().isIn(['draft', 'published', 'hidden']).withMessage('Trạng thái không hợp lệ'),
  body('isFeatured').optional().isBoolean().withMessage('Nổi bật không hợp lệ')
];

export const articleStatusRules = [
  param('id').isMongoId().withMessage('Bài viết không hợp lệ'),
  body('status').isIn(['draft', 'published', 'hidden']).withMessage('Trạng thái không hợp lệ')
];

export const articleFeaturedRules = [
  param('id').isMongoId().withMessage('Bài viết không hợp lệ'),
  body('isFeatured').isBoolean().withMessage('Nổi bật không hợp lệ')
];

function toSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function cleanStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function buildUniqueSlug(title, excludeId) {
  const base = toSlug(title) || `bai-viet-${Date.now()}`;
  let slug = base;
  let index = 2;

  while (await Article.exists({ slug, isDeleted: false, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

function articlePayload(req, overrides = {}) {
  const status = req.body.status || overrides.status || 'published';
  return {
    title: req.body.title,
    summary: req.body.summary || '',
    content: req.body.content || '',
    coverImage: req.body.coverImage || '',
    category: req.body.category || 'Sức khỏe tổng quát',
    specialtyId: req.body.specialtyId || null,
    tags: cleanStringList(req.body.tags),
    status,
    isFeatured: req.body.isFeatured ?? overrides.isFeatured ?? false,
    publishedAt: status === 'published' ? new Date() : null
  };
}

function pagination(queryParams) {
  const page = Math.max(Number(queryParams.page) || 1, 1);
  const limit = Math.min(Math.max(Number(queryParams.limit) || 9, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

function buildPublicFilter(queryParams = {}) {
  const filter = { isDeleted: false, status: 'published' };
  const search = String(queryParams.search || '').trim();

  if (queryParams.category) filter.category = queryParams.category;
  if (queryParams.specialtyId) filter.specialtyId = queryParams.specialtyId;
  if (queryParams.tag) filter.tags = queryParams.tag;
  if (queryParams.featured === 'true') filter.isFeatured = true;

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { summary: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') }
    ];
  }

  return filter;
}

function buildAdminFilter(queryParams = {}) {
  const filter = { isDeleted: false };
  const search = String(queryParams.search || '').trim();

  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.category) filter.category = queryParams.category;
  if (queryParams.authorRole) filter.authorRole = queryParams.authorRole;
  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { summary: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') }
    ];
  }

  return filter;
}

async function ensureDoctorProfile(req) {
  if (!req.user?.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const doctor = await Doctor.findById(req.user.doctorId);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy hồ sơ bác sĩ');
  return doctor;
}

async function ensureSpecialtyExists(specialtyId) {
  if (!specialtyId) return;
  const exists = await Specialty.exists({ _id: specialtyId });
  if (!exists) throw new ApiError(404, 'Không tìm thấy chuyên khoa');
}

export const listPublicArticles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = buildPublicFilter(req.query);
  const [articles, total] = await Promise.all([
    Article.find(filter)
      .populate(articlePopulate)
      .sort({ isFeatured: -1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Article.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    }
  });
});

export const getPublicArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOne({
    slug: req.params.slug,
    status: 'published',
    isDeleted: false
  }).populate(articlePopulate);

  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  article.viewCount += 1;
  await article.save();

  const relatedFilter = {
    _id: { $ne: article._id },
    isDeleted: false,
    status: 'published',
    $or: [{ category: article.category }]
  };
  if (article.specialtyId) relatedFilter.$or.push({ specialtyId: article.specialtyId });

  const relatedArticles = await Article.find(relatedFilter)
    .populate(articlePopulate)
    .sort({ isFeatured: -1, publishedAt: -1 })
    .limit(4);

  res.json({
    success: true,
    data: { article, relatedArticles }
  });
});

export const listDoctorArticles = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctorProfile(req);
  const articles = await Article.find({ doctorId: doctor._id, isDeleted: false })
    .populate(articlePopulate)
    .sort({ createdAt: -1 });

  res.json({ success: true, data: articles });
});

export const createDoctorArticle = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctorProfile(req);
  await ensureSpecialtyExists(req.body.specialtyId || doctor.specialtyId);

  const article = await Article.create({
    ...articlePayload(req, { status: req.body.status || 'published' }),
    slug: await buildUniqueSlug(req.body.title),
    specialtyId: req.body.specialtyId || doctor.specialtyId || null,
    authorId: req.user._id,
    authorRole: 'doctor',
    doctorId: doctor._id
  });

  await createAuditLog({
    req,
    action: 'CREATE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã tạo bài viết ${article.title}`
  });

  res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const updateDoctorArticle = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctorProfile(req);
  const article = await Article.findOne({ _id: req.params.id, doctorId: doctor._id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  await ensureSpecialtyExists(req.body.specialtyId || doctor.specialtyId);
  Object.assign(article, articlePayload(req, { status: article.status }));
  article.slug = await buildUniqueSlug(req.body.title, article._id);
  article.specialtyId = req.body.specialtyId || doctor.specialtyId || null;
  await article.save();

  await createAuditLog({
    req,
    action: 'UPDATE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã cập nhật bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Cập nhật bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const deleteDoctorArticle = asyncHandler(async (req, res) => {
  const doctor = await ensureDoctorProfile(req);
  const article = await Article.findOne({ _id: req.params.id, doctorId: doctor._id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  article.isDeleted = true;
  article.status = 'hidden';
  await article.save();

  await createAuditLog({
    req,
    action: 'DELETE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã xóa bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Xóa bài viết thành công' });
});

export const listAdminArticles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = buildAdminFilter(req.query);
  const [articles, total] = await Promise.all([
    Article.find(filter).populate(articlePopulate).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Article.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    }
  });
});

export const createAdminArticle = asyncHandler(async (req, res) => {
  await ensureSpecialtyExists(req.body.specialtyId);

  const article = await Article.create({
    ...articlePayload(req, { status: req.body.status || 'published', isFeatured: req.body.isFeatured ?? false }),
    slug: await buildUniqueSlug(req.body.title),
    authorId: req.user._id,
    authorRole: 'admin',
    doctorId: null
  });

  await createAuditLog({
    req,
    action: 'CREATE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã tạo bài viết ${article.title}`
  });

  res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const updateAdminArticle = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  await ensureSpecialtyExists(req.body.specialtyId);
  Object.assign(article, articlePayload(req, { status: article.status, isFeatured: article.isFeatured }));
  article.slug = await buildUniqueSlug(req.body.title, article._id);
  await article.save();

  await createAuditLog({
    req,
    action: 'UPDATE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã cập nhật bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Cập nhật bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const updateAdminArticleStatus = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  article.status = req.body.status;
  if (article.status === 'published' && !article.publishedAt) article.publishedAt = new Date();
  await article.save();

  await createAuditLog({
    req,
    action: article.status === 'published' ? 'PUBLISH_ARTICLE' : 'HIDE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã cập nhật trạng thái bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Cập nhật trạng thái bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const updateAdminArticleFeatured = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  article.isFeatured = req.body.isFeatured;
  await article.save();

  await createAuditLog({
    req,
    action: 'FEATURE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã ${article.isFeatured ? 'gắn nổi bật' : 'bỏ nổi bật'} bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Cập nhật nổi bật bài viết thành công', data: await Article.findById(article._id).populate(articlePopulate) });
});

export const deleteAdminArticle = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, isDeleted: false });
  if (!article) throw new ApiError(404, 'Không tìm thấy bài viết');

  article.isDeleted = true;
  article.status = 'hidden';
  await article.save();

  await createAuditLog({
    req,
    action: 'DELETE_ARTICLE',
    entityType: 'Article',
    entityId: article._id,
    entityName: article.title,
    description: `${req.user.name} đã xóa bài viết ${article.title}`
  });

  res.json({ success: true, message: 'Xóa bài viết thành công' });
});
