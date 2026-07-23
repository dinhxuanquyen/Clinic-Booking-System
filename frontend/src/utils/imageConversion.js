function fileNameWithoutExtension(name) {
  const baseName = String(name || '').replace(/\.[^/.]+$/, '');
  return baseName || 'ket-qua-can-lam-sang';
}

export function convertImageFileToPng(file) {
  if (!String(file?.type || '').startsWith('image/')) return Promise.resolve(file);
  if (file.type === 'image/png') return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) {
          throw new Error('Khong the chuyen doi anh');
        }
        context.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Khong the chuyen doi anh'));
            return;
          }
          resolve(new File([blob], `${fileNameWithoutExtension(file.name)}.png`, {
            type: 'image/png',
            lastModified: file.lastModified
          }));
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Khong the doc anh'));
    };

    image.src = objectUrl;
  });
}
