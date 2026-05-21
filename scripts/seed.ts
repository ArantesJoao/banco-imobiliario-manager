import "dotenv/config";
import { db } from "../db";
import { properties } from "../db/schema";
import { PROPERTY_SEEDS } from "../db/seed-data";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding properties...");

  for (const p of PROPERTY_SEEDS) {
    await db
      .insert(properties)
      .values({
        cardNumber: p.cardNumber,
        name: p.name,
        color: p.color,
        groupName: p.groupName,
        isStock: p.isStock,
        purchasePrice: p.purchasePrice ?? null,
        baseRent: p.baseRent ?? null,
        rent1House: p.rent1House ?? null,
        rent2Houses: p.rent2Houses ?? null,
        rent3Houses: p.rent3Houses ?? null,
        rent4Houses: p.rent4Houses ?? null,
        rentHotel: p.rentHotel ?? null,
        houseCost: p.houseCost ?? null,
        hotelCost: p.hotelCost ?? null,
        mortgageValue: p.mortgageValue,
        stockMultiplier: p.stockMultiplier ?? null,
      })
      .onConflictDoUpdate({
        target: properties.cardNumber,
        set: {
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          groupName: sql`excluded.group_name`,
          isStock: sql`excluded.is_stock`,
          purchasePrice: sql`excluded.purchase_price`,
          baseRent: sql`excluded.base_rent`,
          rent1House: sql`excluded.rent_1_house`,
          rent2Houses: sql`excluded.rent_2_houses`,
          rent3Houses: sql`excluded.rent_3_houses`,
          rent4Houses: sql`excluded.rent_4_houses`,
          rentHotel: sql`excluded.rent_hotel`,
          houseCost: sql`excluded.house_cost`,
          hotelCost: sql`excluded.hotel_cost`,
          mortgageValue: sql`excluded.mortgage_value`,
          stockMultiplier: sql`excluded.stock_multiplier`,
        },
      });
  }

  console.log(`Seeded ${PROPERTY_SEEDS.length} cards.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
