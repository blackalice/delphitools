const pathShim = {
  dirname(pathname: string) {
    const lastSlashIndex = pathname.lastIndexOf("/");

    if (lastSlashIndex <= 0) {
      return "";
    }

    return pathname.slice(0, lastSlashIndex);
  },
  normalize(pathname: string) {
    return pathname;
  },
};

export const dirname = pathShim.dirname;
export const normalize = pathShim.normalize;
export default pathShim;
