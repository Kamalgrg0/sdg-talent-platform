function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

export function Pagination({ page = 1, count = 0, perPage = 9, onPage, label = "results" }) {
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  if (count === 0 || totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav className="pagination" aria-label={`${label} pages`}>
      <button
        className="pagination__step"
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <div className="pagination__pages">
        {pages.map((item, index) =>
          item === "gap" ? (
            <span className="pagination__gap" key={`gap-${index}`}>
              …
            </span>
          ) : (
            <button
              key={item}
              className={`pagination__page${item === page ? " is-current" : ""}`}
              type="button"
              onClick={() => onPage(item)}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}
      </div>
      <button
        className="pagination__step"
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}
