export default function MessageBubble({ message, isOwn, fileData, fileName, fileType }) {
  const isImage = fileType?.startsWith("image/");

  function downloadImage() {
    // force download as .jpg
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName?.replace(/\.[^.]+$/, "") + ".jpg" || "image.jpg";
    link.click();
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-4 py-3 rounded-2xl max-w-sm text-sm leading-relaxed ${
          isOwn
            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(99,102,241,0.4)]"
            : "bg-white/10 backdrop-blur-sm text-white border border-white/10 rounded-tl-sm"
        }`}
      >
        {/* Image attachment */}
        {fileData && isImage && (
          <div className="relative group mb-2">
            <img
              src={fileData}
              alt={fileName}
              className="rounded-xl max-w-[220px] max-h-[220px] object-cover cursor-pointer"
              onClick={() => window.open(fileData, "_blank")}
            />
            {/* Download overlay */}
            <button
              onClick={downloadImage}
              title="Download image"
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition bg-black/70 hover:bg-black/90 text-white rounded-lg p-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        )}

        {/* Non-image file attachment */}
        {fileData && !isImage && (
          <a
            href={fileData}
            download={fileName}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition rounded-lg px-3 py-2 mb-2 text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828A4 4 0 1012.343 4.1L5.757 10.686a6 6 0 108.485 8.485L20 13" />
            </svg>
            <span className="truncate max-w-[160px]">{fileName}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}

        {/* Text */}
        {message && <span>{message}</span>}
      </div>
    </div>
  );
}
