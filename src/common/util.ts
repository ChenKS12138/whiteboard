/**
 * @param {number} speedNum
 * @returns {string}
 */
export function formatSpeed(speedNum: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (index < units.length && speedNum > 1024) {
    speedNum = Math.round(speedNum / 1024);
    index += 1;
  }
  return String(speedNum) + units[index] + "/s";
}
