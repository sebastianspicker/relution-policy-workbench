/** Reads regular files through a byte cap to limit resource consumption. */
import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";

export interface BoundedRegularFileReadOptions {
  label: string;
  maxBytes: number;
}

/**
 * Return the byte length of a regular file without following its final path
 * component. Callers can use this to enforce aggregate budgets before parsing.
 */
export function regularFileSizeNoFollow(path: string, options: BoundedRegularFileReadOptions): number {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    return checkedRegularFileSize(descriptor, path, options);
  } finally {
    closeSync(descriptor);
  }
}

/** Read a bounded regular file through a no-follow descriptor. */
export function readBoundedRegularFileNoFollow(path: string, options: BoundedRegularFileReadOptions): Buffer {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const size = checkedRegularFileSize(descriptor, path, options);
    const data = Buffer.alloc(size);
    let offset = 0;
    while (offset < data.length) {
      const bytesRead = readSync(descriptor, data, offset, data.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== data.length) {
      throw new Error(`${options.label} changed while reading: ${path}`);
    }
    return data;
  } finally {
    closeSync(descriptor);
  }
}

function checkedRegularFileSize(descriptor: number, path: string, options: BoundedRegularFileReadOptions): number {
  const stats = fstatSync(descriptor);
  if (!stats.isFile()) {
    throw new Error(`${options.label} must be a regular file: ${path}`);
  }
  if (stats.size > options.maxBytes) {
    throw new Error(`${options.label} exceeds the ${String(options.maxBytes)} byte limit: ${path}`);
  }
  return stats.size;
}
