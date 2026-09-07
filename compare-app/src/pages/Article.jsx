import { Link, useParams } from 'react-router-dom';
import { ARTICLES, getArticle } from '../data/articles.js';
import ArticleCard from '../components/ArticleCard.jsx';
export default function Article() {
  const { slug } = useParams();
  const a = getArticle(slug);
  if (!a) return <div className="container-x py-20 text-center"><h1 className="h2">המאמר לא נמצא</h1><Link to="/articles" className="btn-primary mt-6">לכל המאמרים</Link></div>;
  return (
    <article className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-4 text-xs text-muted"><Link to="/articles" className="hover:text-navy">מאמרים</Link> › <span className="text-navy">{a.tag}</span></nav>
        <span className="eyebrow">{a.tag} · {a.minutes} דק׳ קריאה</span>
        <h1 className="h1 mt-2 !text-3xl sm:!text-4xl">{a.title}</h1>
        <p className="mt-3 text-lg text-muted">{a.excerpt}</p>
        <div className="card mt-8 space-y-5 p-6 leading-relaxed sm:p-10">
          {a.body.map((b, i) => typeof b === 'string' ? <p key={i} className="text-ink">{b}</p> : <div key={i}><h2 className="text-xl font-black text-navy">{b.h}</h2><p className="mt-1.5 text-ink">{b.p}</p></div>)}
        </div>
        <div className="mt-8 rounded-2xl bg-navy p-6 text-center text-white"><p className="text-lg font-black">רוצה שאבדוק את המצב שלך?</p><Link to="/contact" className="btn-primary mt-3">בדקי לי איפה כדאי להשקיע</Link></div>
        <h3 className="mt-12 text-lg font-black text-navy">עוד מאמרים</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{ARTICLES.filter(x => x.slug !== slug).slice(0, 2).map(x => <ArticleCard key={x.slug} a={x} />)}</div>
      </div>
    </article>
  );
}
