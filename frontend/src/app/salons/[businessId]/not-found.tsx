import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="space-y-4 p-5">
      <h1 className="text-2xl font-bold">سالن در دسترس نیست</h1>
      <p className="leading-8 text-ink-soft">این سالن در فهرست عمومی وجود ندارد.</p>
      <Link
        className="inline-flex min-h-11 items-center font-bold text-petrol"
        href="/"
      >
        بازگشت به سالن‌ها
      </Link>
    </section>
  );
}
