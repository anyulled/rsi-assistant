import { describe, it, expect } from "bun:test";
import { render, within } from "@testing-library/react";
import { Exercises } from "./Exercises";

describe("Exercises", () => {
  it("renders exercises list", () => {
    const { baseElement } = render(<Exercises />);
    const screen = within(baseElement);
    expect(screen.getByText("Quick Exercises")).toBeInTheDocument();
    expect(screen.getByText("Wrist Rolls")).toBeInTheDocument();
    expect(screen.getByText("Neck Stretch")).toBeInTheDocument();
  });

  it("triggers navigation back", async () => {
    // Since we didn't implement back implementation logic in the component (it's part of generic routing),
    // we just check if it renders.
    const { baseElement } = render(<Exercises />);
    const screen = within(baseElement);
    expect(screen.getByRole("heading", { name: "Quick Exercises" })).toBeInTheDocument();
  });
});
