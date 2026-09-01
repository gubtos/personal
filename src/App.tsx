import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import MembersListPage from "@/pages/MembersListPage";
import MemberDetailPage from "@/pages/MemberDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  // Remove the static index.html splash once React has actually painted.
  useEffect(() => {
    document.getElementById("initial-loading")?.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MembersListPage />} />
          <Route path="/membros/:memberId" element={<MemberDetailPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;

