import ArticleCard from '../components/ArticleCard.jsx';
import { ARTICLES } from '../data/articles.js';
export default function Articles() {
  return (
    <section className="container-x py-10">
      <span className="eyebrow">תוכן מקצועי</span>
      <h1 className="h2 mt-1">מאמרים קצרים, החלטות טובות</h1>
      <p className="mt-2 max-w-2xl text-muted">הבסיס שכל חוסך/ת צריכ/ה לפני שמשווים מספרים: איך בוחרים, מה ההבדלים, ומה באמת משפיע על החיסכון.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">{ARTICLES.map(a => <ArticleCard key={a.slug} a={a} />)}</div>
    </section>
  );
}
