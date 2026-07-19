import { createElement } from "react";

export function createPwaIconArt() {
  return createElement(
    "div",
    {
      style: {
        alignItems: "center",
        background:
          "linear-gradient(145deg, rgb(34, 111, 255) 0%, rgb(18, 97, 255) 55%, rgb(10, 66, 191) 100%)",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        position: "relative",
        width: "100%",
      },
    },
    createElement("div", {
      style: {
        background: "rgba(255, 255, 255, 0.13)",
        border: "2px solid rgba(255, 255, 255, 0.24)",
        borderRadius: "24%",
        height: "78%",
        position: "absolute",
        width: "78%",
      },
    }),
    createElement(
      "div",
      {
        style: {
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: "5%",
          justifyContent: "center",
          position: "relative",
        },
      },
      createElement(
        "div",
        {
          style: {
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "35vh",
            fontWeight: 800,
            letterSpacing: "-0.08em",
            lineHeight: 0.9,
            paddingRight: "0.08em",
          },
        },
        "PT",
      ),
      createElement("div", {
        style: {
          background: "rgba(255, 255, 255, 0.92)",
          borderRadius: 999,
          height: "4vh",
          width: "31vh",
        },
      }),
    ),
  );
}
