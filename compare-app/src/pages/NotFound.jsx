import { Link } from 'react-router-dom';
export default function NotFound() {
  return <section className="container-x py-24 text-center"><div className="text-7xl font-black text-ice">404</div><h1 className="h2 mt-2">העמוד לא נמצא</h1><Link to="/" className="btn-primary mt-6">לעמוד הבית</Link></section>;
}
