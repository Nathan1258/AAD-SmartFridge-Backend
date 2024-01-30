const router = require("express").Router();
const { verify, verifyAdmin } = require("./verify");
const { knex } = require("./sql");
const {
  OKResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  MalformedBodyResponse,
} = require("./customResponses");
const { convertToTimestamp } = require("./Utils");

router.post("/", verify, (req, res) => {
  let DBQUERY;

  if (req.query.instock) {
    DBQUERY = knex("products as p")
      .select(
        "p.productID",
        "p.Name",
        "p.Price",
        "i.itemID",
        "i.quantity",
        "i.expiryDate",
        "i.lastUpdated",
      )
      .join("inventory as i", "p.productID", "=", "i.itemID")
      .where("i.quantity", ">", 0);
  } else {
    DBQUERY = knex("products").select("*");
  }

  return DBQUERY.then((response) => {
    return OKResponse(
      res,
      req.query.instock ? "Returned all items in stock" : "Returned all items",
      response,
    );
  }).catch((error) => {
    console.error("Error getting products", error);
    return InternalServerErrorResponse(
      res,
      "Could not fetch products. Try again later.",
    );
  });
});
router.post("/fetch/:productName", verify, (req, res) => {
  const productName = req.params.productName;

  return knex("products")
    .where("Name", productName)
    .then((rows) => {
      return OKResponse(res, "Product returned", rows);
    })
    .catch((error) => {
      console.error("Error getting all products: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not fetch all products. Try again later.",
      );
    });
});
router.post("/insert", verify, async (req, res) => {
  const { itemID, quantity, expiryDate } = req.body;
  const expiryDateFormat = /^\d{2}-\d{2}-\d{2}$/;

  if (!itemID)
    return MalformedBodyResponse(
      res,
      "'itemID' parameter is missing from request body",
    );
  if (!quantity)
    return MalformedBodyResponse(
      res,
      "'quantity' parameter is missing from request body",
    );
  if (!expiryDate)
    return MalformedBodyResponse(
      res,
      "'expiryDate' parameter is missing from request body",
    );
  if (!expiryDateFormat.test(expiryDate))
    return MalformedBodyResponse(
      res,
      "'expiryDate' must be in DD-MM-YY format",
    );

  return knex("inventory")
    .insert({
      itemId: itemID,
      quantity: quantity,
      expiryDate: convertToTimestamp(expiryDate),
    })
    .onConflict("itemId")
    .merge({ quantity: knex.raw("quantity + VALUES(quantity)") })
    .then((rows) => {
      if (rows <= 0) {
        return InternalServerErrorResponse(
          res,
          "Could not update inventory with selected item: " + itemID,
        );
      }
      return OKResponse(res, "Inventory updated successfully");
    })
    .catch((error) => {
      console.error(err);
      return InternalServerErrorResponse(
        res,
        "Could not update Inventory. Please try again.",
      );
    });
});
router.post("/remove", verify, async (req, res) => {
  const { itemID, quantity } = req.body;

  if (!itemID)
    return MalformedBodyResponse(
      res,
      "'itemID' parameter is missing from request body",
    );
  if (!quantity)
    return MalformedBodyResponse(
      res,
      "'quantity' parameter is missing from request body",
    );

  return knex("inventory")
    .update({
      quantity: knex.raw("GREATEST(quantity - ?, 0)", [quantity]),
    })
    .where("itemId", itemID)
    .then((rows) => {
      if (rows <= 0) {
        return NotFoundResponse(
          res,
          "Item not found or quantity is already zero.",
        );
      }
      return OKResponse(res, "Inventory updated successfully");
    })
    .catch((error) => {
      console.error(err);
      return InternalServerErrorResponse(
        res,
        "Could not update Inventory. Please try again.",
      );
    });
});

router.post("/expiring", verifyAdmin, async (req, res) => {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const formattedThreeDaysFromNow = threeDaysFromNow
      .toISOString()
      .slice(0, 10);

    const orderID = generateOrderID();

    const productsInOrder = await knex("orders")
      .select("productID")
      .where("orderID", orderID);

    const productIDsInOrder = productsInOrder.map((order) => order.productID);

    const productsExpiringSoon = await knex("inventory")
      .join("products", "inventory.itemID", "=", "products.productID")
      .select("inventory.*", "products.Name")
      .where("inventory.expiryDate", "<=", formattedThreeDaysFromNow)
      .whereNotIn("inventory.itemID", productIDsInOrder);

    if (productsExpiringSoon.length > 0) {
      return OKResponse(
        res,
        "Products expiring within 3 days and not in this week's order have been returned",
        productsExpiringSoon,
      );
    } else {
      return OKResponse(res, "No products are expiring soon", []);
    }
  } catch (error) {
    console.error("Could not fetch products expiring soon ", error);
    return InternalServerErrorResponse(
      res,
      "Unable to fetch products. Please try again later.",
    );
  }
});

function generateOrderID(offsetWeeks = 0) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - offsetWeeks * 7);

  const [year, week] = getWeekNumber(currentDate);
  const shortYear = year.toString().slice(-2);
  const formattedWeek = week.toString().padStart(2, "0");
  return formattedWeek + shortYear;
}

module.exports = router;
