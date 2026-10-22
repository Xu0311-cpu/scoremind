const SUPPORTED_EXTENSIONS = [".musicxml", ".xml"];

export function isSupportedScoreFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}
