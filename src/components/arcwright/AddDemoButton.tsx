"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { BookOpenText } from "lucide-react";

type Props = {
  onClick: () => void;
};

const AddDemoButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button onClick={onClick} variant="secondary" className="shadow">
        <BookOpenText className="mr-2 h-4 w-4" />
        Add Demo Book
      </Button>
    </div>
  );
};

export default AddDemoButton;