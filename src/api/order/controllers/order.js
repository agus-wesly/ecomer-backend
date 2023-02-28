"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { name, email, products } = ctx.request.body;

    const line_items = await Promise.all(
      products.map(async (prod) => {
        const item = await strapi
          .service("api::product.product")
          .findOne(prod.id);

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
            },
            unit_amount: item.price,
          },
          quantity: prod.qty,
        };
      })
    );

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/",
      payment_method_types: ["card"],
      customer_email: email,
    });

    //Add to strapi checkout
    await strapi.service("api::order.order").create({
      data: {
        name,
        products,
        sessionId: session.id,
      },
    });

    return {
      session,
    };
  },
}));
