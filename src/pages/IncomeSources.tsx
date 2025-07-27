import { useState } from "react";
import { IncomeSourceManager } from "@/components/IncomeSourceManager";
import { IncomeAnalytics } from "@/components/IncomeAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IncomeSources() {
  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sources">Income Sources</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sources">
          <IncomeSourceManager />
        </TabsContent>
        
        <TabsContent value="analytics">
          <IncomeAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}