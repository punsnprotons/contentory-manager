
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import HeaderWrapper from "@/components/layout/Header.wrapper";

const Index: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderWrapper />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Index;
