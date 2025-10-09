import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./AuthProvider";

const queryClient = new QueryClient(
  {
    defaultOptions: {
      queries: {
        retry: 3,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
      },
    },
  }
);

export const AppProvider = ({ children }) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  );
};