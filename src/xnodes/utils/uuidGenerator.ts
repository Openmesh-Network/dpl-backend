export const generateUUID8 = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
};
