const router = require("express").Router();
const { verify } = require("./verify");
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

  DBQUERY.then((response) => {
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

  try {
    const result = await knex("inventory")
      .insert({
        itemId: itemID,
        quantity: quantity,
        expiryDate: convertToTimestamp(expiryDate),
      })
      .onConflict("itemId")
      .merge({ quantity: knex.raw("quantity + VALUES(quantity)") });

    if (result <= 0) {
      return InternalServerErrorResponse(
        res,
        "Could not update inventory with selected item: " + itemID,
      );
    }
    return OKResponse(res, "Inventory updated successfully");
  } catch (err) {
    console.error(err);
    return InternalServerErrorResponse(
      res,
      "Could not update Inventory. Please try again.",
    );
  }
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

  try {
    const result = await knex("inventory")
      .update({
        quantity: knex.raw("GREATEST(quantity - ?, 0)", [quantity]),
      })
      .where("itemId", itemID);

    if (result === 0) {
      return NotFoundResponse(
        res,
        "Item not found or quantity is already zero.",
      );
    }
    return OKResponse(res, "Inventory updated successfully");
  } catch (err) {
    console.error(err);
    return InternalServerErrorResponse(
      res,
      "Could not update Inventory. Please try again.",
    );
  }
});

module.exports = router;
