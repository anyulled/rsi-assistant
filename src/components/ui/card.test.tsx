import { render, within } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card Components", () => {
  it("renders all card subcomponents correctly", () => {
    const { container } = render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Card Title</CardTitle>
          <CardDescription className="custom-desc">Card Description</CardDescription>
        </CardHeader>
        <CardContent className="custom-content">
          <p>Content goes here</p>
        </CardContent>
        <CardFooter className="custom-footer">
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    const card = container.querySelector(".custom-card");
    expect(card).toBeDefined();
    expect(card?.className).toContain("rounded-lg border bg-card");

    const header = container.querySelector(".custom-header");
    expect(header).toBeDefined();
    expect(header?.className).toContain("flex flex-col space-y-1.5 p-6");

    const title = within(container).getByText("Card Title");
    expect(title.className).toContain("custom-title");
    expect(title.className).toContain("text-2xl font-semibold");

    const desc = within(container).getByText("Card Description");
    expect(desc.className).toContain("custom-desc");
    expect(desc.className).toContain("text-sm text-muted-foreground");

    const content = container.querySelector(".custom-content");
    expect(content).toBeDefined();
    expect(content?.className).toContain("p-6 pt-0");

    const footer = container.querySelector(".custom-footer");
    expect(footer).toBeDefined();
    expect(footer?.className).toContain("flex items-center");
  });
});
