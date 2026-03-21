import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();

vi.mock("@/hooks/useModeAwareNavigate", () => ({
  useModeAwareNavigate: () => mockNavigate,
}));

const mockSearchData = {
  results: [
    {
      id: "c1",
      type: "course",
      title: "React Fundamentals",
      description: "Learn React basics",
      breadcrumb: "React Fundamentals",
      url: "/study/c1",
    },
    {
      id: "l1",
      type: "lesson",
      title: "Intro to Hooks",
      description: "useState and useEffect",
      breadcrumb: "React Fundamentals > Basics > Intro to Hooks",
      url: "/study/c1/lessons/l1",
    },
    {
      id: "n1",
      type: "note",
      title: "Note: Hooks Overview",
      description: "My notes on hooks",
      breadcrumb: "React > Basics > Hooks Overview",
      url: "/study/c1/lessons/l1",
    },
  ],
  query: "react",
  total: 3,
};

let searchData: typeof mockSearchData | null = null;
let searchFetching = false;

vi.mock("@/hooks/useSearch", () => ({
  useSearchQuery: () => ({
    data: searchData,
    isFetching: searchFetching,
  }),
}));

import { CommandPalette } from "@/components/search/CommandPalette";

describe("CommandPalette", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    searchData = null;
    searchFetching = false;
  });

  it("renders when open", () => {
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
  });

  it("shows empty state with hint text", () => {
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Search across all your content"),
    ).toBeInTheDocument();
  });

  it("renders search results", () => {
    searchData = mockSearchData;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByText("Intro to Hooks")).toBeInTheDocument();
    expect(screen.getByText("Note: Hooks Overview")).toBeInTheDocument();
  });

  it("shows type badges for results", () => {
    searchData = mockSearchData;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Course")).toBeInTheDocument();
    expect(screen.getByText("Lesson")).toBeInTheDocument();
    expect(screen.getByText("Reading Lesson")).toBeInTheDocument();
  });

  it("shows result count in footer", () => {
    searchData = mockSearchData;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText("3 results")).toBeInTheDocument();
  });

  it("navigates on click", () => {
    searchData = mockSearchData;
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>,
    );
    // Click the first option (Course result)
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/study/c1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates on Enter key", () => {
    searchData = mockSearchData;
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={onOpenChange} />
      </MemoryRouter>,
    );
    const input = screen.getByTestId("command-palette-input");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/study/c1");
  });

  it("keyboard arrow keys change active item", () => {
    searchData = mockSearchData;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    const input = screen.getByTestId("command-palette-input");

    // First item should be active by default
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // Press down
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    // Press down again
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[2]).toHaveAttribute("aria-selected", "true");

    // Press up
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("shows loading spinner when fetching", () => {
    searchFetching = true;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    // Type something to trigger the "searching" state
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "test" } });
    expect(
      screen.getByTestId("command-palette-results").querySelector(".animate-spin"),
    ).toBeInTheDocument();
  });

  it("shows breadcrumb in results", () => {
    searchData = mockSearchData;
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("React Fundamentals > Basics > Intro to Hooks"),
    ).toBeInTheDocument();
  });

  it("has search placeholder text", () => {
    render(
      <MemoryRouter>
        <CommandPalette open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
    expect(
      screen.getByPlaceholderText("Search courses, lessons, notes..."),
    ).toBeInTheDocument();
  });
});
