import { MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "./components/ui/button";
import ChatPage from "./pages/ChatPage";
import ProductsPage from "./pages/ProductsPage";

type Page = "products" | "chat";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("products");

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Spur</h1>
                <p className="text-xs text-muted-foreground">E-Commerce</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-secondary/50 border border-border/50">
              <Button
                variant={currentPage === "products" ? "default" : "ghost"}
                onClick={() => setCurrentPage("products")}
                className="gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Products
              </Button>
              <Button
                variant={currentPage === "chat" ? "default" : "ghost"}
                onClick={() => setCurrentPage("chat")}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {currentPage === "products" && <ProductsPage />}
          {currentPage === "chat" && <ChatPage />}
        </main>

        {/* Footer Glow Effect */}
        <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-primary/5 to-transparent" />
      </div>
    </TooltipProvider>
  );
}

export default App;
