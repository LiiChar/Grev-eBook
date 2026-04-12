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