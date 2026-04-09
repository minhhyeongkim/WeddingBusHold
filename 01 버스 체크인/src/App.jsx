import { useState, useEffect } from "react";
import BoardPage from "./pages/BoardPage";
import AdminPage from "./pages/AdminPage";

function getPage() {
  return window.location.hash === "#admin" ? "admin" : "board";
}

export default function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const handler = () => setPage(getPage());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return page === "admin" ? <AdminPage /> : <BoardPage />;
}
