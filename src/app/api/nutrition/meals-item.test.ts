import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as handlePost, DELETE as handleDelete } from "./meals/item/route";
import { DELETE as handleDeleteById } from "./meals/item/[id]/route";

function makeJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "content-type": "application/json"
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser
    },
    from: mockFrom
  })),
  isSupabaseConfigurationError: vi.fn(() => false)
}));

describe("Meal Item API (/api/nutrition/meals/item)", () => {
  const TEST_USER_ID = "11111111-2222-4333-8444-555555555555";
  const TEST_FOOD_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const TEST_MEAL_ID = "12345678-1111-4222-8333-444444444444";
  const TEST_ITEM_ID = "87654321-1111-4222-8333-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "tester@fitai.app" } },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/nutrition/meals/item Validation", () => {
    it("rejects unauthenticated requests", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Not authenticated")
      });

      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: 150,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authentication required");
    });

    it("rejects invalid date format", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "07-10-2026",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: 100,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain("Date must be YYYY-MM-DD");
    });

    it("rejects invalid meal type", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "second-breakfast",
        foodId: TEST_FOOD_ID,
        quantityGrams: 100,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(422);
    });

    it("rejects zero or negative quantity", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: 0,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(422);

      const negReq = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: -50,
        nameSnapshot: "Banana"
      });

      const negRes = await handlePost(negReq);
      expect(negRes.status).toBe(422);
    });

    it("rejects quantity above allowed maximum (5000g)", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: 6000,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain("5000g or less");
    });

    it("rejects payload missing food identifier (foodId, fdcId, and quickFoodId)", async () => {
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        quantityGrams: 100,
        nameSnapshot: "Banana"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/nutrition/meals/item Persistence & Verification", () => {
    it("creates/finds meal and inserts meal_item with verified server nutrition totals", async () => {
      // Mock meals query (existing meal found)
      const mockMealsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: TEST_MEAL_ID },
                error: null
              })
            })
          })
        })
      });

      // Mock meal_items insertion
      const mockMealItemsInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEST_ITEM_ID, created_at: "2026-10-07T12:00:00Z" },
            error: null
          })
        })
      });

      // Mock food_nutrients query (1008: 89 kcal/100g, 1003: 1.1 g/100g)
      const mockFoodNutrientsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { nutrient_id: "1008", amount_per_100g: 89, unit: "kcal" },
            { nutrient_id: "1003", amount_per_100g: 1.1, unit: "g" },
            { nutrient_id: "1005", amount_per_100g: 22.8, unit: "g" },
            { nutrient_id: "1004", amount_per_100g: 0.3, unit: "g" },
            { nutrient_id: "1079", amount_per_100g: 2.6, unit: "g" }
          ],
          error: null
        })
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "meals") {
          return { select: mockMealsSelect, insert: vi.fn() };
        }
        if (table === "meal_items") {
          return { insert: mockMealItemsInsert };
        }
        if (table === "food_nutrients") {
          return { select: mockFoodNutrientsSelect };
        }
        return { select: vi.fn(), insert: vi.fn() };
      });

      // Client sends quantity 200g and attempts to send spoofed macros (should be ignored)
      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "lunch",
        foodId: TEST_FOOD_ID,
        quantityGrams: 200,
        nameSnapshot: "Banana, raw",
        servingDescription: "2 medium bananas",
        calories: 99999, // client spoof attempt
        protein: 888 // client spoof attempt
      });

      const res = await handlePost(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.item.id).toBe(TEST_ITEM_ID);
      expect(json.item.mealId).toBe(TEST_MEAL_ID);
      expect(json.item.weightGrams).toBe(200);

      // Verified 200g calculations:
      // 89 kcal * 2 = 178 kcal
      // 1.1 g * 2 = 2.2 g protein
      // 22.8 g * 2 = 45.6 g carbs
      // 0.3 g * 2 = 0.6 g fat
      // 2.6 g * 2 = 5.2 g fiber
      expect(json.item.calories).toBe(178);
      expect(json.item.protein).toBe(2.2);
      expect(json.item.carbs).toBe(45.6);
      expect(json.item.fat).toBe(0.6);
      expect(json.item.fiber).toBe(5.2);

      // Verify meal_items was inserted with the correct user_id
      expect(mockMealItemsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER_ID,
          meal_id: TEST_MEAL_ID,
          food_id: TEST_FOOD_ID,
          quantity_grams: 200,
          item_name_snapshot: "Banana, raw"
        })
      );
    });

    it("handles missing nutrients gracefully without crashing", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: TEST_MEAL_ID },
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        if (table === "meal_items") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TEST_ITEM_ID, created_at: "2026-10-07T12:00:00Z" },
                  error: null
                })
              })
            })
          };
        }
        if (table === "food_nutrients") {
          // No nutrients recorded in DB
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          };
        }
        return { select: vi.fn(), insert: vi.fn() };
      });

      const req = makeJsonRequest("http://localhost:3000/api/nutrition/meals/item", "POST", {
        date: "2026-10-07",
        mealType: "dinner",
        foodId: TEST_FOOD_ID,
        quantityGrams: 100,
        nameSnapshot: "Unknown Water Product"
      });

      const res = await handlePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.item.calories).toBe(0);
      expect(json.item.protein).toBe(0);
    });
  });

  describe("DELETE /api/nutrition/meals/item and /api/nutrition/meals/item/[id]", () => {
    it("allows authenticated owner to delete their meal item", async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "meal_items") {
          return { delete: mockDelete };
        }
        return {};
      });

      const req = makeJsonRequest(`http://localhost:3000/api/nutrition/meals/item?id=${TEST_ITEM_ID}`, "DELETE");
      const res = await handleDelete(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.deletedId).toBe(TEST_ITEM_ID);
    });

    it("rejects unauthenticated delete requests", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Not authenticated")
      });

      const req = makeJsonRequest(`http://localhost:3000/api/nutrition/meals/item?id=${TEST_ITEM_ID}`, "DELETE");
      const res = await handleDelete(req);
      expect(res.status).toBe(401);
    });

    it("enforces user_id matching so cross-user deletion is prevented in RESTful route", async () => {
      const mockEqUserId = vi.fn().mockResolvedValue({ error: null });
      const mockEqItemId = vi.fn().mockReturnValue({ eq: mockEqUserId });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqItemId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "meal_items") {
          return { delete: mockDelete };
        }
        return {};
      });

      const req = makeJsonRequest(`http://localhost:3000/api/nutrition/meals/item/${TEST_ITEM_ID}`, "DELETE");
      const res = await handleDeleteById(req, {
        params: Promise.resolve({ id: TEST_ITEM_ID })
      });

      expect(res.status).toBe(200);
      expect(mockEqItemId).toHaveBeenCalledWith("id", TEST_ITEM_ID);
      expect(mockEqUserId).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    });
  });
});
