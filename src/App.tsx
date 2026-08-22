import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Preloader from "./components/Preloader";
import SeoManager from "./components/SeoManager";
import Index from "./_pages_backup/Index";
import Classes from "./_pages_backup/Classes";
import ClassDetail from "./_pages_backup/ClassDetail";
import Equipment from "./_pages_backup/Equipment";
import EquipmentDetail from "./_pages_backup/EquipmentDetail";
import Membership from "./_pages_backup/Membership";
import Trainers from "./_pages_backup/Trainers";
import TrainerDetail from "./_pages_backup/TrainerDetail";
import About from "./_pages_backup/About";
import Contact from "./_pages_backup/Contact";
import Login from "./_pages_backup/Login";
import Register from "./_pages_backup/Register";
import Dashboard from "./_pages_backup/Dashboard";
import NotFound from "./_pages_backup/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Preloader />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SeoManager />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/trainers" element={<Trainers />} />
              <Route path="/trainers/:id" element={<TrainerDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
