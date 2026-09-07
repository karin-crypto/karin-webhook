import { Link } from 'react-router-dom';
export default function ArticleCard({ a }) {
  return (
    <Link to={`/articles/${a.slug}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="mb-3 flex items-center justify-between text-xs"><span className="eyebrow">{a.tag}</span><span className="text-muted">{a.minutes} דק׳ קריאה</span></div>
      <h3 className="text-lg font-black leading-snug text-navy group-hover:text-blue">{a.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{a.excerpt}</p>
      <span className="mt-4 text-sm font-bold text-blue">לקריאה ←</span>
    </Link>
  );
}
