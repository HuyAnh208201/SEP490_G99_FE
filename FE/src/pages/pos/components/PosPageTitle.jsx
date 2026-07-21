/** Centered page title — clean, no brand bar. */
export default function PosPageTitle({ title }) {
  return (
    <div className="-mx-4 mb-4 border-b border-[var(--admin-border)] bg-white px-4 py-4 text-center lg:-mx-5 lg:mb-5 lg:px-5">
      <h1 className="text-xl font-bold uppercase tracking-[0.14em] text-[var(--admin-text)] sm:text-2xl">
        {title}
      </h1>
    </div>
  );
}
