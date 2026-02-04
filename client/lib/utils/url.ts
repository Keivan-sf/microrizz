export function joinURLPaths(basePath: string, additionalPath: string) {
  return basePath.replace(/\/$/, "") + "/" + additionalPath.replace(/^\//, "");
}
