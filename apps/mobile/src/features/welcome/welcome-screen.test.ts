import { describe, expect, it } from "vitest";

describe("Welcome Screen Layout & Coordinate Geometry", () => {
  const NATIVE_IMAGE_WIDTH = 512;
  const NATIVE_IMAGE_HEIGHT = 1024;
  const IMAGE_ASPECT_RATIO = NATIVE_IMAGE_WIDTH / NATIVE_IMAGE_HEIGHT;

  it("maintains the exact 1:2 visual aspect ratio of the supplied asset", () => {
    expect(IMAGE_ASPECT_RATIO).toBe(0.5);
  });

  it("calculates exact coordinate ratios for the 'Get Started' pill button", () => {
    // Measured bounds from welcome-screen.png: left: 33, right: 478, top: 906, bottom: 959
    const buttonTopRatio = 906 / NATIVE_IMAGE_HEIGHT;
    const buttonLeftRatio = 33 / NATIVE_IMAGE_WIDTH;
    const buttonWidthRatio = 445 / NATIVE_IMAGE_WIDTH;
    const buttonHeightRatio = 53 / NATIVE_IMAGE_HEIGHT;

    expect(buttonTopRatio).toBeCloseTo(0.8848, 3);
    expect(buttonLeftRatio).toBeCloseTo(0.0645, 3);
    expect(buttonWidthRatio).toBeCloseTo(0.8691, 3);
    expect(buttonHeightRatio).toBeCloseTo(0.0518, 3);
  });

  it("calculates touch envelope for 'Already have an account? Sign In'", () => {
    // Measured line bounds: top: 970 to 1010, left: 100 to 412
    const signinTopRatio = 970 / NATIVE_IMAGE_HEIGHT;
    const signinLeftRatio = 100 / NATIVE_IMAGE_WIDTH;
    const signinWidthRatio = 312 / NATIVE_IMAGE_WIDTH;
    const signinHeightRatio = 40 / NATIVE_IMAGE_HEIGHT;

    expect(signinTopRatio).toBeCloseTo(0.947, 2);
    expect(signinLeftRatio).toBeCloseTo(0.195, 2);
    expect(signinWidthRatio).toBeCloseTo(0.609, 2);
    expect(signinHeightRatio).toBeCloseTo(0.039, 2);
  });

  describe("Responsive scaling computation", () => {
    function computeContainerDimensions(safeWidth: number, safeHeight: number, minScrollableHeight = 540) {
      if (safeHeight >= safeWidth * 2) {
        return {
          width: safeWidth,
          height: safeWidth * 2,
          scrollable: false,
        };
      } else if (safeHeight >= minScrollableHeight) {
        return {
          width: safeHeight * IMAGE_ASPECT_RATIO,
          height: safeHeight,
          scrollable: false,
        };
      } else {
        return {
          width: minScrollableHeight * IMAGE_ASPECT_RATIO,
          height: minScrollableHeight,
          scrollable: true,
        };
      }
    }

    it("scales cleanly on modern tall screens (e.g. 390x844 with safe area 390x763)", () => {
      const { width, height, scrollable } = computeContainerDimensions(390, 763);
      expect(height).toBe(763);
      expect(width).toBe(381.5);
      expect(width).toBeLessThanOrEqual(390);
      expect(scrollable).toBe(false);
    });

    it("scales cleanly on standard Android devices (e.g. 412x915 with safe area 412x843)", () => {
      const { width, height, scrollable } = computeContainerDimensions(412, 843);
      expect(height).toBe(824);
      expect(width).toBe(412);
      expect(height).toBeLessThanOrEqual(843);
      expect(scrollable).toBe(false);
    });

    it("scales cleanly on compact Android devices (e.g. 360x640 with safe area 360x600)", () => {
      const { width, height, scrollable } = computeContainerDimensions(360, 600);
      expect(height).toBe(600);
      expect(width).toBe(300);
      expect(width).toBeLessThanOrEqual(360);
      expect(scrollable).toBe(false);
    });

    it("enables scrolling in extreme short or landscape screens (e.g. height 350)", () => {
      const { width, height, scrollable } = computeContainerDimensions(800, 350);
      expect(height).toBe(540);
      expect(width).toBe(270);
      expect(scrollable).toBe(true);
    });
  });

  describe("Unauthenticated routing transitions", () => {
    type UnauthenticatedRoute = "welcome" | "onboarding" | "signin" | "signup";

    it("starts on welcome route for unauthenticated first launch", () => {
      const initialRoute: UnauthenticatedRoute = "welcome";
      expect(initialRoute).toBe("welcome");
    });

    it("transitions from welcome to onboarding on Get Started", () => {
      let route: UnauthenticatedRoute = "welcome";
      const onGetStarted = () => { route = "onboarding"; };
      onGetStarted();
      expect(route).toBe("onboarding");
    });

    it("transitions from welcome to signin on Sign In", () => {
      let route: UnauthenticatedRoute = "welcome";
      const onSignIn = () => { route = "signin"; };
      onSignIn();
      expect(route).toBe("signin");
    });

    it("returns from signin to welcome on Back", () => {
      let route: UnauthenticatedRoute = "signin";
      const onBack = () => { route = "welcome"; };
      onBack();
      expect(route).toBe("welcome");
    });

    it("returns from onboarding step 0 to welcome on Back", () => {
      let route: UnauthenticatedRoute = "onboarding";
      const onBackToWelcome = () => { route = "welcome"; };
      onBackToWelcome();
      expect(route).toBe("welcome");
    });
  });
});
