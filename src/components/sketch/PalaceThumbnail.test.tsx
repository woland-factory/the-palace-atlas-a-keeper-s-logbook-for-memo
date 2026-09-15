import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PalaceThumbnail } from "./PalaceThumbnail";
import { PalaceCard } from "../PalaceCard";
import { newPalace, newSpot, type Palace } from "../../model/atlas";

function drawn(): Palace {
  const p = newPalace("Childhood home");
  p.spots = [newSpot(100, 100, 0), newSpot(300, 200, 1), newSpot(500, 400, 2)];
  return p;
}

describe("PalaceThumbnail", () => {
  it("renders one marker per spot for a drawn palace", () => {
    const { container } = render(<PalaceThumbnail palace={drawn()} />);
    expect(container.querySelectorAll("circle.thumb__spot")).toHaveLength(3);
    // A connecting path shows the walk order.
    expect(container.querySelector("path.thumb__path")).not.toBeNull();
  });

  it("shows a quiet placeholder for an empty palace, not a blank box", () => {
    const { container } = render(<PalaceThumbnail palace={newPalace("Empty")} />);
    expect(container.querySelector(".thumb--empty")).not.toBeNull();
    expect(container.querySelectorAll("circle.thumb__spot")).toHaveLength(0);
  });
});

describe("PalaceCard", () => {
  it("links the palace name to its editor route", () => {
    const palace = drawn();
    const { getByRole } = render(
      <MemoryRouter>
        <ul>
          <PalaceCard
            palace={palace}
            now={new Date()}
            onRename={() => {}}
            onDelete={() => {}}
          />
        </ul>
      </MemoryRouter>,
    );
    const link = getByRole("link", { name: "Childhood home" });
    expect(link).toHaveAttribute("href", `/palace/${palace.id}`);
  });
});

describe("PalaceThumbnail health", () => {
  it("colors each thumbnail spot by its health band when now is given", () => {
    const { container } = render(
      <PalaceThumbnail palace={drawn()} now={new Date()} />,
    );
    const banded = container.querySelectorAll('[data-health="unwalked"]');
    expect(banded).toHaveLength(3);
  });
});
