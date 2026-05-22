/**
 * Sidebar component tests
 *
 * Covers:
 * - Hidden on /login and /
 * - Renders all 9 nav items
 * - Active link receives --active class
 * - Collapse toggle hides labels, shows ChevronRight
 * - Theme toggle calls toggleTheme
 * - Sign out clears token and redirects to /login
 * - Dark / light mode icon swap
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mocks — factories use ONLY inline jest.fn(), no outer-variable closures
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/dashboard"),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: jest.fn(() => ({ theme: "dark", toggleTheme: jest.fn() })),
}));

jest.mock("@/lib/auth", () => ({
  removeToken: jest.fn(),
}));

// Canvas is not available in jsdom
HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

// ---------------------------------------------------------------------------
// Typed refs to mocked modules
// ---------------------------------------------------------------------------

import Sidebar from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { removeToken } from "@/lib/auth";

const mockUsePathname = usePathname as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseTheme = useTheme as jest.Mock;
const mockRemoveToken = removeToken as jest.Mock;

// Per-render fresh mocks exposed to test assertions
let currentPush: jest.Mock;
let currentToggleTheme: jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSidebar(pathname = "/dashboard", theme = "dark") {
  currentPush = jest.fn();
  currentToggleTheme = jest.fn();
  mockUsePathname.mockReturnValue(pathname);
  mockUseRouter.mockReturnValue({ push: currentPush });
  mockUseTheme.mockReturnValue({ theme, toggleTheme: currentToggleTheme });
  return render(<Sidebar />);
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

describe("Sidebar visibility", () => {
  it("renders null on /login", () => {
    const { container } = renderSidebar("/login");
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null on /", () => {
    const { container } = renderSidebar("/");
    expect(container).toBeEmptyDOMElement();
  });

  it("renders on /dashboard", () => {
    renderSidebar("/dashboard");
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders on /alerts", () => {
    renderSidebar("/alerts");
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

describe("Navigation items", () => {
  const NAV_LABELS = [
    "System Boot",
    "Dashboard",
    "Analytics",
    "Connections",
    "Threat Alerts",
    "Geo-IP Map",
    "ML Analytics",
    "Performance",
    "System Config",
  ];

  beforeEach(() => renderSidebar("/dashboard"));

  it("renders all 9 nav links", () => {
    NAV_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("active link has --active class", () => {
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveClass("sidebar__link--active");
  });

  it("non-active links do not have --active class", () => {
    const alertsLink = screen.getByText("Threat Alerts").closest("a");
    expect(alertsLink).not.toHaveClass("sidebar__link--active");
  });

  it("nav links point to correct hrefs", () => {
    expect(screen.getByText("Threat Alerts").closest("a")).toHaveAttribute("href", "/alerts");
    expect(screen.getByText("Geo-IP Map").closest("a")).toHaveAttribute("href", "/map");
    expect(screen.getByText("ML Analytics").closest("a")).toHaveAttribute("href", "/ml");
  });
});

// ---------------------------------------------------------------------------
// Collapse toggle
// ---------------------------------------------------------------------------

describe("Collapse toggle", () => {
  it("hides nav labels after collapse", () => {
    renderSidebar("/dashboard");

    const collapseBtn = screen.getByRole("button", { name: "" }); // ChevronLeft has no text
    fireEvent.click(collapseBtn);

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("shows ChevronRight icon after collapse", () => {
    renderSidebar("/dashboard");

    const sidebar = screen.getByRole("complementary");
    const collapseBtn = sidebar.querySelector(".sidebar__collapse-btn")!;
    fireEvent.click(collapseBtn);

    expect(sidebar).toHaveClass("sidebar--collapsed");
  });

  it("restores labels after second toggle", () => {
    renderSidebar("/dashboard");

    const sidebar = screen.getByRole("complementary");
    const collapseBtn = sidebar.querySelector(".sidebar__collapse-btn")!;

    fireEvent.click(collapseBtn); // collapse
    fireEvent.click(collapseBtn); // expand

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------

describe("Theme toggle", () => {
  it("calls toggleTheme on click", () => {
    renderSidebar("/dashboard", "dark");

    fireEvent.click(screen.getByTitle("Light Mode"));

    expect(currentToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("shows 'Light Mode' button in dark theme", () => {
    renderSidebar("/dashboard", "dark");
    expect(screen.getByText("Light Mode")).toBeInTheDocument();
  });

  it("shows 'Dark Mode' button in light theme", () => {
    renderSidebar("/dashboard", "light");
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

describe("Sign out", () => {
  beforeEach(() => {
    mockRemoveToken.mockClear();
  });

  it("calls removeToken on sign out", () => {
    renderSidebar("/dashboard");
    fireEvent.click(screen.getByTitle("Sign Out"));
    expect(mockRemoveToken).toHaveBeenCalledTimes(1);
  });

  it("redirects to /login after sign out", () => {
    renderSidebar("/dashboard");
    fireEvent.click(screen.getByTitle("Sign Out"));
    expect(currentPush).toHaveBeenCalledWith("/login");
  });
});

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

describe("Brand", () => {
  it("shows brand title when expanded", () => {
    renderSidebar("/dashboard");
    expect(screen.getByText("NIDS Sentinel")).toBeInTheDocument();
    expect(screen.getByText("Threat Detection")).toBeInTheDocument();
  });

  it("hides brand text when collapsed", () => {
    renderSidebar("/dashboard");
    const sidebar = screen.getByRole("complementary");
    const collapseBtn = sidebar.querySelector(".sidebar__collapse-btn")!;
    fireEvent.click(collapseBtn);
    expect(screen.queryByText("NIDS Sentinel")).not.toBeInTheDocument();
  });
});
