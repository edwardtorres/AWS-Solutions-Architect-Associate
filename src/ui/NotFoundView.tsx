export default function NotFoundView() {
  return (
    <section aria-labelledby="not-found-title" className="max-w-prose">
      <h2 id="not-found-title" className="text-3xl font-semibold">
        Page not found
      </h2>
      <p className="mt-3">There is no page at this address. The link may be out of date, or the page may have been renamed.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className="btn" href="#/map">
          Go to the city map
        </a>
        <a className="btn" href="#/progress">
          Open progress
        </a>
      </div>
    </section>
  );
}
