/** Offers text as a file download. Falls back to nothing if the browser blocks it (the notes stay in the save either way). */
export function downloadText(filename: string, text: string): void {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch {
    /* blocked */
  }
}
