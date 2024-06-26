const router = require("express").Router();
const { verify, verifyAdmin, verifyDelivery } = require("./verify");
const { knex } = require("./sql");
const cron = require("node-cron");
const {
  getCurrentTimestamp,
  generateUniqueAccessPIN,
  addToActivityLogNoReq,
} = require("./Utils");
const {
  MalformedBodyResponse,
  OKResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} = require("./customResponses");

// Scheduled stock analysis and order creation every Monday at 8AM
cron.schedule("0 8 * * 1", async () => {
  const lastWeekOrderID = generateOrderID(1);
  if ((await processDelivery(lastWeekOrderID)) === true) {
    await addToActivityLogNoReq(
      "Last week's order has been processed for delivery.",
    );
  } else {
    await addToActivityLogNoReq(
      "Could not process last week's delivery. Contact your admin.",
    );
  }
  const newOrderID = generateOrderID();
  await processLowQuantityProducts(newOrderID);
});
// Run a task every 12 hours to process items near out of stock and automatically add to order
cron.schedule("0 */12 * * *", async () => {
  console.log("Processing products near depletion");
  const currentOrderID = generateOrderID();
  await processLowQuantityProducts(currentOrderID);
  console.log("Processing of products near depletion has completed.");
  console.log("Removing items that have expired");
  await processExpiredItems();
  console.log("Removed items that have expired");
});
router.post("/", verify, async (req, res) => {
  return knex("deliveries")
    .select("*")
    .orderBy("deliveryDate", "asc")
    .then((deliveries) => {
      if (deliveries.length > 0) {
        return OKResponse(res, "All deliveries returned", deliveries);
      }
      return OKResponse(res, "No deliveries available", []);
    })
    .catch((error) => {
      console.log("Could not get all deliveries: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not get all deliveries. Please try again later",
      );
    });
});
router.post("/verify", verifyDelivery, async (req, res) => {
  const deliveryID = req.body.delivery.deliveryID;

  knex("deliveries")
    .update({ status: "Delivery in process" })
    .where("deliveryID", deliveryID)
    .then(async (data) => {
      if (data.length <= 0) console.log("Could not update delivery status");
      await addToActivityLogNoReq(
        `Order ${req.body.delivery.orderID} has changed status`,
      );
    })
    .catch((error) => {
      console.error("Error updating delivery status", error);
    });
  return OKResponse(res, "Delivery data has been returned", req.body.delivery);
});
router.post("/note", verifyDelivery, async (req, res) => {
  const deliveryNote = req.body.note;
  const deliveryID = req.body.delivery.deliveryID;

  if (!deliveryNote)
    return MalformedBodyResponse(res, "'note' is required in request body");

  return knex("deliveries")
    .update({ deliveryNotes: deliveryNote })
    .where("deliveryID", deliveryID)
    .then(async (data) => {
      if (data.length <= 0)
        return InternalServerErrorResponse(
          res,
          "Unable to update delivery note. Please try again later",
        );
      await addToActivityLogNoReq(
        `Order ${req.body.delivery.orderID} has had its notes updated`,
      );
      return OKResponse(res, "Delivery note successfully updated");
    })
    .catch((error) => {
      console.error("Error updating delivery note", error);
      return InternalServerErrorResponse(
        res,
        "Unable to update delivery note. Please try again later",
      );
    });
});

router.post("/delivered", verifyDelivery, async (req, res) => {
  const {
    deliveryID,
    orderID,
    deliveredItems,
    undeliveredItems,
    deliveryNotes,
  } = req.body;

  if (!deliveredItems) {
    return MalformedBodyResponse(
      res,
      "'deliveredItems' array is expected in the request body.",
    );
  }

  return knex
    .transaction(async (trx) => {
      try {
        const updates = [];

        deliveredItems.forEach((product) => {
          const updatePromise = trx("orders")
            .update({ status: "Delivered" })
            .where({
              orderID: parseInt(orderID),
              productID: parseInt(product.productID),
            })
            .then((rows) => console.log(`Rows affected ${rows}`));
          updates.push(updatePromise);
        });

        if (undeliveredItems && undeliveredItems.length > 0) {
          undeliveredItems.forEach((product) => {
            const updatePromise = trx("orders")
              .update({ status: "Undelivered" })
              .where({
                orderID: parseInt(orderID),
                productID: parseInt(product.productID),
              })
              .then((rows) => console.log(`Rows affected ${rows}`));
            updates.push(updatePromise);
          });
        }

        await Promise.all(updates);

        await trx("deliveries")
          .update({
            accessCode: null,
            itemsUndelivered: undeliveredItems.length,
            status: "Delivered",
            deliveryNotes: deliveryNotes,
            isDelivered: true,
          })
          .where("deliveryID", parseInt(deliveryID))
          .then((rows) => console.log(`Rows affected ${rows}`));

        await trx.commit();

        await addToActivityLogNoReq(
          `Order ${orderID} has been marked as delivered`,
        );
        console.log(
          "Delivery and orders updated successfully, and logged to activity log.",
        );
        return OKResponse(res, "Order has successfully been updated");
      } catch (error) {
        await trx.rollback();
        await addToActivityLogNoReq(
          `Order ${orderID} has had an error in processing. Please contact your admin for more information`,
        );
        console.error(
          "Transaction failed, rolled back, and logged error to activity log: ",
          error,
        );
        return InternalServerErrorResponse(
          res,
          "Order could not be updated. Please try again later.",
        );
      }
    })
    .catch((error) => {
      console.error("An unexpected error occurred: ", error);
      return InternalServerErrorResponse(
        res,
        "Order could not be updated. Please try again later.",
      );
    });
});

router.post("/order", verify, async (req, res) => {
  let orderID = parseInt(generateOrderID()).toString();
  if (req.body.orderID) {
    orderID = req.body.orderID;
  }
  return knex("orders")
    .select("*")
    .join("products", "orders.productID", "=", "products.productID")
    .select("orders.*", "products.Name", "products.Price")
    .where("orderID", orderID)
    .then((orders) => {
      if (orders.length > 0) {
        return OKResponse(
          res,
          "Order for current week has been returned",
          orders,
        );
      }
      return OKResponse(res, "Order is not available", []);
    })
    .catch((error) => {
      console.log("Could not get order: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not get order. Please try again later",
      );
    });
});

router.post("/final-order", verifyDelivery, async (req, res) => {
  if (!req.body.orderID)
    return MalformedBodyResponse(res, "'orderID' is expected in request body");
  return knex("orders")
    .select("*")
    .join("products", "orders.productID", "=", "products.productID")
    .select("orders.*", "products.Name", "products.Price")
    .where("orderID", req.body.orderID)
    .then((orders) => {
      if (orders.length > 0) {
        return OKResponse(
          res,
          "Order for current week has been returned",
          orders,
        );
      }
      return OKResponse(res, "Order is not available", []);
    })
    .catch((error) => {
      console.log("Could not get order: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not get order. Please try again later",
      );
    });
});

router.post("/add", verifyAdmin, async (req, res) => {
  let endpoint = "";
  const { products, productID, quantity } = req.body;
  const orderID = generateOrderID();
  let validArrayProvided = false;

  if (req.body.endpoint) endpoint = req.body.endpoint;

  if ((!products || products.length === 0) && (!productID || !quantity)) {
    return MalformedBodyResponse(
      res,
      "'products' (an array of products) or an individual 'productID' + 'quantity' is expected in request body",
    );
  }

  if (products) {
    const response = await isValidProductsArray(products);
    if (response.valid) {
      validArrayProvided = true;
    } else {
      return MalformedBodyResponse(res, response.message);
    }
  }

  if (!validArrayProvided) {
    // Check single productID and quantity body items as array as not provided
    if (
      typeof quantity !== "number" ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return MalformedBodyResponse(
        res,
        "'quantity' must be a positive integer.",
      );
    }
    if (!validArrayProvided && (await isProductInOrder(productID, orderID)))
      return MalformedBodyResponse(
        res,
        "Product is already in this week's order",
      );
  }

  if (validArrayProvided) {
    let productsAdded = [];

    const insertPromises = products.map((product) => {
      return knex("orders")
        .insert({
          orderID: orderID,
          productID: product.itemID,
          quantity: product.quantity,
          orderedAt: getCurrentTimestamp(),
          status: "Ordered",
          triggerType: "User added" + endpoint,
        })
        .then((row) => {
          if (row.length > 0) {
            productsAdded.push(product);
          }
        })
        .catch((error) => {
          console.error(
            "Could not add a product from products array to this weeks order: ",
            error,
          );
        });
    });

    return Promise.all(insertPromises)
      .then(() => {
        return OKResponse(
          res,
          "Successfully added " +
            productsAdded.length +
            " products to this week's order",
          productsAdded,
        );
      })
      .catch((error) => {
        console.error("Error adding item:", error);
        return InternalServerErrorResponse(
          res,
          "An error occurred while adding products to this week's order. Please try again later.",
        );
      });
  }

  return knex("orders")
    .insert({
      orderID: orderID,
      productID: productID,
      quantity: quantity,
      orderedAt: getCurrentTimestamp(),
      status: "Processing",
      triggerType: "User added" + endpoint,
    })
    .then((row) => {
      if (row.length > 0)
        return OKResponse(res, "Product has been added to this weeks order");
      return InternalServerErrorResponse(
        res,
        "Product could not be added to this weeks order. Please try again",
      );
    })
    .catch((error) => {
      console.error("Could not add product to this weeks order: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not add product to this weeks order. Please try again later.",
      );
    });
});

router.post("/remove", verifyAdmin, async (req, res) => {
  const { productID } = req.body;
  const orderID = generateOrderID();

  if (!productID)
    return MalformedBodyResponse(
      res,
      "'productID' is expected in request body",
    );

  knex("orders")
    .where({
      orderID: orderID,
      productID: productID,
    })
    .del()
    .then((rowsAffected) => {
      if (rowsAffected === 0) {
        return NotFoundResponse(
          res,
          "Item specified was not found within this week's order.",
        );
      }
      return OKResponse(res, "Order successfully deleted");
    })
    .catch((error) => {
      console.error("Error deleting order: ", error);
      return InternalServerErrorResponse(
        res,
        "Error occurred while deleting order. Please try again later.",
      );
    });
});

router.post("/edit", verifyAdmin, async (req, res) => {
  const { productID, quantity } = req.body;
  const orderID = generateOrderID();

  if (!productID)
    return MalformedBodyResponse(
      res,
      "'productID' is expected in request body",
    );

  if (!quantity)
    return MalformedBodyResponse(res, "'quantity' is expected in request body");

  knex("orders")
    .update({
      quantity: quantity,
    })
    .where({
      orderID: orderID,
      productID: productID,
    })
    .then((rowsAffected) => {
      if (rowsAffected === 0) {
        return NotFoundResponse(
          res,
          "Item specified was not found within this week's order.",
        );
      }
      return OKResponse(res, "Order successfully updated");
    })
    .catch((error) => {
      console.error("Error updating order: ", error);
      return InternalServerErrorResponse(
        res,
        "Error occurred while updating order. Please try again later.",
      );
    });
});

router.post("/finalise", verifyAdmin, async (req, res) => {
  const orderID = req.body.orderID;

  if (!orderID) {
    return MalformedBodyResponse(
      res,
      "'orderID' is missing from the request body",
    );
  }

  try {
    const orders = await knex("deliveries")
      .select("*")
      .where("orderID", orderID);

    if (orders.length === 0) {
      return NotFoundResponse(res, "Order was not found");
    }

    const order = orders[0];

    if (order.isDelivered) {
      await knex("deliveries")
        .update({ isChecked: 1, status: "Completed" })
        .where("orderID", orderID);

      const products = await knex("orders")
        .select("productID", "quantity")
        .where({ orderID: orderID, status: "Delivered" });

      const expiryDate = addDaysToDate(new Date(), 4);

      for (let product of products) {
        await knex("inventory")
          .insert({
            itemId: product.productID,
            quantity: product.quantity,
            expiryDate: formatForMySQL(expiryDate),
          })
          .onConflict("itemId")
          .merge({ quantity: knex.raw("quantity + ?", [product.quantity]) });
      }

      await addToActivityLogNoReq(
        `Order ${orderID} has been completed and items have been added to Fridge's inventory`,
      );
      return OKResponse(
        res,
        "Order finalised and checked. Inventory updated successfully.",
      );
    } else {
      return MalformedBodyResponse(
        res,
        "Order cannot be finalised as it has not been delivered yet.",
      );
    }
  } catch (error) {
    console.error("Error finalising order:", error);
    return InternalServerErrorResponse(
      res,
      "Could not finalise the order. Please try again.",
    );
  }
});

module.exports = router;

async function isValidProductsArray(products) {
  const orderID = generateOrderID();

  if (!Array.isArray(products)) {
    return { valid: false, message: "'products' is not a valid array." };
  }
  for (const product of products) {
    // Check if productID and quantity exist
    if (!product.itemID || !product.quantity) {
      return {
        valid: false,
        message:
          "'itemID' and 'quantity' should exist in each element of the array.",
      };
    }
    // Check if itemID is a valid integer
    if (
      typeof product.itemID !== "number" ||
      product.productID <= 0 ||
      !Number.isInteger(product.itemID)
    ) {
      return {
        valid: false,
        message:
          "one 'itemID' item within the array is not a valid positive integer.",
      };
    }
    // Check if quantity is a valid integer
    if (
      typeof product.quantity !== "number" ||
      product.quantity <= 0 ||
      !Number.isInteger(product.quantity)
    ) {
      return {
        valid: false,
        message:
          "one 'quantity' item within the array is not a valid positive integer.",
      };
    }
    // Check if itemID points to a valid product
    if (!(await isProductValid(product.itemID))) {
      return {
        valid: false,
        message:
          "one give 'itemID' item does not associate to a valid product.",
      };
    }

    if (await isProductInOrder(product.itemID, orderID)) {
      return {
        valid: false,
        message:
          "One or more products provided in the array is already in this week's order.",
      };
    }
  }
  return { valid: true, message: "" };
}

function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatForMySQL(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

function generateOrderID(offsetWeeks = 0) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - offsetWeeks * 7);

  const [year, week] = getWeekNumber(currentDate);
  const shortYear = year.toString().slice(-2);
  const formattedWeek = week.toString().padStart(2, "0");
  return formattedWeek + shortYear;
}

async function processDelivery(orderID) {
  const accessCode = await generateUniqueAccessPIN();
  const orderTotalItems = await getOrderTotalItems(orderID);
  const orderTotalAmount = await processOrderTotalAmount(orderID);
  const formattedTotalAmount = "£" + orderTotalAmount.toFixed(2);

  return knex("deliveries")
    .insert({
      orderID: orderID,
      deliveryDate: getCurrentTimestamp(),
      accessCode: accessCode,
      itemsToDeliver: orderTotalItems,
      status: "Processed",
      totalCost: formattedTotalAmount,
    })
    .then((order) => {
      return order >= 1;
    })
    .catch((error) => {
      console.error("Error processing new delivery", error);
      return false;
    });
}

async function getOrderTotalItems(orderID) {
  return knex("orders")
    .count("orderID as count")
    .where("orderID", orderID)
    .first()
    .then((count) => {
      return count.count;
    })
    .catch((error) => {
      console.error("Could not fetch total item count", error);
      return 0;
    });
}

async function processOrderTotalAmount(orderID) {
  try {
    const orderItems = await knex("orders")
      .select("productID", "quantity")
      .where("orderID", orderID);

    return await Promise.all(
      orderItems.map(async (item) => {
        const product = await knex("products")
          .select("Price")
          .where("productID", item.productID)
          .first();
        const price = parseFloat(product.Price.replace("£", ""));
        return price * item.quantity;
      }),
    ).then((amounts) => {
      return amounts.reduce((acc, amount) => acc + amount, 0);
    });
  } catch (error) {
    console.error("Could not fetch total order amount", error);
  }
}

async function processExpiredItems() {
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(0, 0, 0, 0);
  const formattedThreeDaysFromNow = threeDaysFromNow.toISOString().slice(0, 10);

  const expiringItems = await knex("inventory")
    .join("products", "inventory.itemID", "=", "products.productID")
    .select("inventory.*", "products.Name")
    .where("inventory.expiryDate", "<=", formattedThreeDaysFromNow);
  for (const item of expiringItems) {
    await addToActivityLogNoReq(
      `Item ${item.Name} is expiring soon. Please check your expiring items to reorder.`,
    );
  }
  const expiredItems = await knex("inventory")
    .join("products", "inventory.itemID", "=", "products.productID")
    .select("products.Name")
    .where("expiryDate", "<", currentDate);

  await knex("inventory").where("expiryDate", "<", currentDate).del();

  for (const item of expiredItems) {
    console.log(`Removing ${item.Name} from inventory as it has expired`);
    await addToActivityLogNoReq(
      `Item ${item.Name} has been removed from the fridge as it has expired`,
    );
  }
  console.log("done processing expired items");
}

async function processLowQuantityProducts(newOrderID) {
  try {
    const products = await knex("inventory")
      .join("products", "inventory.itemID", "=", "products.productID")
      .select("inventory.*", "products.Name")
      .where("quantity", "<", 3);
    for (const product of products) {
      const alreadyAdded = await isProductInOrder(product.itemID, newOrderID);
      if (!alreadyAdded) {
        await addLowQuantityProduct(product, newOrderID);
      }
    }
  } catch (error) {
    console.error("Could not fetch all low quantity products: ", error);
  }
}

async function addLowQuantityProduct(product, orderID) {
  return knex("orders")
    .insert({
      orderID: orderID,
      productID: product.itemID,
      quantity: 10,
      orderedAt: getCurrentTimestamp(),
      status: "Processing",
      triggerType: "System trigger",
    })
    .then(async (rows) => {
      await addToActivityLogNoReq(
        `Automatically reordered "${product.Name}" as quantity is less than 3.`,
      );
      return rows > 1;
    })
    .catch((error) => {
      console.error("Error adding product to order", error);
      return false;
    });
}

function isProductValid(productID) {
  return knex("products")
    .select("*")
    .where("productID", productID)
    .then((product) => {
      return product.length > 0;
    })
    .catch((error) => {
      console.log("Could not check if product is valid", error);
    });
}

function isProductInOrder(productID, orderID) {
  return knex("orders")
    .select("*")
    .where({
      orderID: orderID,
      productID: productID,
    })
    .then((rows) => {
      return rows.length > 0;
    })
    .catch((error) => {
      console.error("Error checking product in order", error);
      return false;
    });
}
