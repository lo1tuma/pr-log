export const padAllLines = (text: string, length: number, char: string = " "): string => {
  const padding = (char[0] ?? "").repeat(length);

  return padding + text.replace(/\n/g, `\n${padding}`);
};
