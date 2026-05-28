export const getFileExtension = (fileName: string) => {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot + 1);
};

export const getFileName = (fileName: string) => {
  const lastSlash = fileName.lastIndexOf('/');
  if (lastSlash === -1) return fileName;
  return fileName.slice(lastSlash + 1).split('.').slice(0, -1).join('.');
};

export const getCoverDataUrl = (cover?: string | number[] | Uint8Array): string | null => {
  if (!cover) return null;

  if (typeof cover === 'string') {
    return cover.startsWith('data:') ? cover : `data:image/jpeg;base64,${cover}`;
  }

  if (cover.length === 0) return null;

  try {
    const buffer = cover instanceof Uint8Array ? cover : new Uint8Array(cover);
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
    }

    return `data:image/jpeg;base64,${window.btoa(binary)}`;
  } catch {
    return null;
  }
};