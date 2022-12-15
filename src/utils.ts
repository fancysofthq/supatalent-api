import { Stream } from "stream";

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const sizes = [
    "bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export async function timer(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function timeout(
  ms: number,
  promise: Promise<any>,
  errorMsg?: string
) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(errorMsg || "Timeout"));
    }, ms);

    promise.then(resolve, reject);
  });
}
