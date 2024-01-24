const router = require("express").Router();
const { verify } = require("./verify");
const { query } = require("./sql");
const {
  OKResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
  MalformedBodyResponse,
} = require("./customResponses");
const { convertToTimestamp } = require("./Utils");

router.post("/", verify, (req, res) => {
  const sqlQuery = `SELECT
                                p.productID,
                                p.Name,
                                p.Price,
                                i.itemID,
                                i.quantity,
                                i.expiryDate,
                                i.lastUpdated
                            FROM
                                products p
                            JOIN
                                inventory i ON p.productID = i.itemID;
`;

  if (req.query.instock) {
    return query(sqlQuery)
      .then((response) => {
        return OKResponse(res, "Returned all items in stock", response);
      })
      .catch((error) => {
        console.error("Error getting all items in stock", error);
        return InternalServerErrorResponse(
          res,
          "Could not fetch products. Try again later.",
        );
      });
  }

  return query("SELECT * FROM products")
    .then((response) => {
      return OKResponse(res, "Returned all items", response);
    })
    .catch((error) => {
      console.error("Error getting all products");
      return InternalServerErrorResponse(
        res,
        "Could not fetch all products. Try again later.",
      );
    });
});

router.post("/:productName", verify, (req, res) => {
  const productName = req.params.productName;
  return query("SELECT * FROM products WHERE Name = ?", [productName])
    .then((response) => {
      if (response <= 0) return NotFoundResponse(res, "Item does not exist.");
      return OKResponse(res, "Item returned", response[0]);
    })
    .catch((error) => {
      console.error("Error getting all products");
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

  const sqlUpsert = `
        INSERT INTO inventory (itemId, quantity, expiryDate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        quantity = quantity + VALUES(quantity);`;

  const params = [itemID, quantity, convertToTimestamp(expiryDate)];

  try {
    const result = await query(sqlUpsert, params);
    if (result <= 0)
      return InternalServerErrorResponse(
        res,
        "Could not update Inventory. Please try again.",
      );
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

  // Check for missing parameters
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

  // SQL to decrease the quantity of the item
  const sqlUpdate = `
        UPDATE inventory 
        SET quantity = GREATEST(quantity - ?, 0)
        WHERE itemId = ?`;

  const params = [quantity, itemID];

  try {
    const result = await query(sqlUpdate, params);
    if (result.affectedRows === 0)
      return NotFoundResponse(
        res,
        "Item not found or quantity is already zero.",
      );
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
