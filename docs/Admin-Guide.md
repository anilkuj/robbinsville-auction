# Robbinsville Premier League - Admin Guide

Welcome to the Admin Guide for the Robbinsville Premier League Auction App. As the League Admin, you have full control over squad constraints, team budgets, player data, and the live flow of the auction event.

## 1. Initial League Setup
Before the auction day begins, you must configure the basic rules of your league.
1. Log in to the application using the username `admin` and your configured admin password.
2. Navigate to the **League Setup** tab.
3. **Global Settings**: Define the total number of teams, the required squad size (how many players a team *must* have), starting budget, and the minimum bid increment.
4. **Team Configuration**: Provide names and passwords for all participating teams. *Teams will use these credentials to log in.*
5. **Pool Configuration**: Define your player pools (e.g., A1, A2, B, C) and assign a base price to each pool. The total number of players across all pools *must* exactly equal `Teams × Squad Size`.
   *   *Note: If you need to delete a pool or add a new one, the UI will prompt you to "Merge" or "Split" players to ensure the total mathematical count remains perfectly balanced.*
6. Click **Save League Config**.

## 2. Importing Players
Once your league settings are saved, you must upload your player roster. 
1. Navigate to the **Auction Controls** tab.
2. Under "Import Players", download the CSV Template.
3. Fill out the template. Your CSV *must* have a `name` column and a `pool` column. The `pool` values must exactly match the pools you defined in Step 1.
4. *(Optional)* Add a `type` column and set it to `owner` for franchise owners. Add a `team` column for owners to assign them to a team automatically. Owners skip the live auction and their price is calculated as the average of their respective pool.
5. Upload the CSV.

## 3. Running the Live Auction
The **Auction Controls** tab is your cockpit during the live event.

*   **Next Player:** Pulls the next randomly selected player from the current pool and begins their auction phase.
*   **Pause / Resume Timer:** Temporarily pauses the countdown clock. Bidding is disabled while paused. Best used if a team has a technical issue or a dispute arises.
*   **Cancel Last Bid:** Located next to the Resume button, this allows you to completely abort the current player's auction. It returns the player to the `PENDING` pool so they can be re-auctioned later.
*   **Mark Unsold:** If the timer runs out and no one has bid, use this to officially move the player to the Unsold list. Alternatively, if "Manual" mode is enabled, wait for the timer to expire and click **HAMMER (Unsold)**.
*   **Accept Bid:** If "Manual" mode is enabled, the timer will hit 0 and wait for you to physically close the sale. Click **HAMMER (Sold)** to finalize the sale to the highest bidder.

### Live Settings
You can tweak settings on the fly without refreshing:
*   **End Mode:** Switch between "Timer" (auto-sells when clock hits zero) and "Manual" (waits for admin to click Accept Bid).
*   **Player Order:** Switch between "Fixed" (alphabetical) or "Random" (random pull within the active pool).

## 4. Fixing Mistakes (Manual Overrides)
Auctions are chaotic. You have tools to fix errors instantly.

*   **Manual Sale:** Open the "Manual Sale" accordion at the bottom of the Auction Controls. You can force-sell any Pending or Unsold player to any team for a specific price. This is useful if the app had a glitch, or a team accidentally missed a bid that everyone in the room agreed should count.
*   **Edit Sale Price:** In the **Player Data** tab, find any previously sold player and click the ✏️ Edit icon. You can change their final sale price. The app will automatically refund the team's budget, deduct the new price, and recalculate owner pool averages instantly.
*   **Re-Auction:** In the **Player Data** or **Unsold Players** tab, click the ↺ icon next to a player to return them to the `PENDING` queue. If they were already sold, their previous team receives a full refund and the player is removed from their roster.
*   **System Restores:** If you press one of the reset buttons (Load Test Data, Reset Auction, Restore Backup), the app will prompt you for a **Storage Preference**, which defaults to `Force Local JSON` for safe disk writes.
