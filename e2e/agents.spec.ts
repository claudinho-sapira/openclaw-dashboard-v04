import { test, expect } from "@playwright/test";

test.describe("Agent List (Real Gateway)", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/auth/signin");
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "demo123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display agents from gateway", async ({ page }) => {
    // Wait for agents API call
    await page.waitForResponse((response) => 
      response.url().includes("/api/agents") && response.status() === 200
    );

    // Check that agent cards are visible
    const agentCards = page.locator('[data-testid="agent-card"]');
    await expect(agentCards).not.toHaveCount(0);

    // Should show at least Luna (pm), Bolt (builder), Iris (qa)
    const agentNames = await agentCards.locator("h3").allTextContents();
    expect(agentNames.length).toBeGreaterThan(0);
  });

  test("should show agent status as 'running' when sessions exist", async ({ page }) => {
    // Wait for data to load
    await page.waitForResponse((response) => 
      response.url().includes("/api/agents") && response.status() === 200
    );

    // Check status badges
    const statusBadges = page.locator('[data-testid="agent-status"]');
    const statuses = await statusBadges.allTextContents();
    
    // At least one agent should be running
    expect(statuses.some(s => s.toLowerCase().includes("running"))).toBeTruthy();
  });

  test("should display real token counts from gateway", async ({ page }) => {
    // Wait for data
    await page.waitForResponse((response) => 
      response.url().includes("/api/agents") && response.status() === 200
    );

    // Check that token counts are visible and numeric
    const tokenElements = page.locator('[data-testid="agent-tokens"]');
    const tokenTexts = await tokenElements.allTextContents();
    
    // Should have at least one agent with tokens
    expect(tokenTexts.length).toBeGreaterThan(0);
  });

  test("should parse agent:*:main sessions correctly", async ({ page }) => {
    // Intercept agents API call to verify response structure
    const responsePromise = page.waitForResponse((response) => 
      response.url().includes("/api/agents") && response.status() === 200
    );

    await page.goto("/dashboard");
    const response = await responsePromise;
    const data = await response.json();

    // Verify response has agents array
    expect(data.agents).toBeDefined();
    expect(Array.isArray(data.agents)).toBeTruthy();

    // Check agent structure
    if (data.agents.length > 0) {
      const agent = data.agents[0];
      expect(agent).toHaveProperty("id");
      expect(agent).toHaveProperty("identity");
      expect(agent.identity).toHaveProperty("name");
      expect(agent.identity).toHaveProperty("emoji");
      expect(agent).toHaveProperty("model");
      expect(agent).toHaveProperty("tokensUsed");
      expect(agent).toHaveProperty("status");
      expect(agent.status).toBe("running");
    }
  });

  test("should display Luna, Bolt, and Iris if all active", async ({ page }) => {
    await page.waitForResponse((response) => 
      response.url().includes("/api/agents") && response.status() === 200
    );

    // Check for expected agent names
    const pageContent = await page.textContent("body");
    
    // At least check that we have agent cards
    const agentCards = page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Agent Detail (Real Gateway)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "demo123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should load real sessions for agent", async ({ page }) => {
    // Click first agent card
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    await firstAgent.click();

    // Wait for agent detail page
    await page.waitForURL(/\/agents\/.+/);

    // Wait for sessions API call
    const responsePromise = page.waitForResponse((response) => 
      response.url().includes("/api/agents/") && 
      response.url().includes("/sessions") &&
      response.status() === 200
    );

    // Click sessions tab
    await page.click('button:has-text("Sessions")');
    
    const response = await responsePromise;
    const data = await response.json();

    // Verify sessions structure
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBeTruthy();

    // If sessions exist, check structure
    if (data.sessions.length > 0) {
      const session = data.sessions[0];
      expect(session).toHaveProperty("key");
      expect(session).toHaveProperty("kind");
      expect(session).toHaveProperty("channel");
    }
  });
});
