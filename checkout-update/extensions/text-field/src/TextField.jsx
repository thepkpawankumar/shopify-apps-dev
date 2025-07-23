import {
  reactExtension,
  Banner,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  TextField,
  useCartLines,
  useSettings,
  useAttributeValues,
  useExtensionCapability,
  useBuyerJourneyIntercept,
  SkeletonText,
} from "@shopify/ui-extensions-react/checkout";
import { useEffect, useState } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.delivery-address.render-after", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension, query } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const lines = useCartLines();

  // Use the merchant-defined settings to retrieve the extension's content
   const {enabled: ENABLED, label: LABEL, product_tag: PRODUCT_TAG} = useSettings();

//  const ENABLED = true;
//  const LABEL = "Company ID";
//  const PRODUCT_TAG = "Accessory";

    // Set a default status for the text field if a merchant didn't configure the text field in the checkout editor
    const label = LABEL ?? 'Custom field';
  
  const [attributeValue] =
  useAttributeValues([
    label
  ]);

  // Set up the app state
  const [text, setText] = useState(attributeValue || '');
  const [validationError, setValidationError] = useState("");

  // Return if not enabled
  if (!ENABLED) {
    return null;
  }
  
  useEffect(() => {
    setSearchQuery(BuildSearchQuery(lines, PRODUCT_TAG?.trim()));
  }, [lines]);

  useEffect(() => {

    if(searchQuery) {
      fetchProducts();
    }
  }, [searchQuery]);

  function BuildSearchQuery(lines, tag) {
    const cartLineProductIds = lines.map((item) => item?.merchandise?.product?.id.replace("gid://shopify/Product/", ""));
    let query = "";
    if(tag) {
      query = "tag:" + tag + " AND (";
    } else {
      query = "(";
    }
    cartLineProductIds.forEach((id, index) => {
      if(index == 0) {
        query += "(id:" + id + ")";
      } else {
        query += " OR (id:" + id + ")";
      }
    });
    query += ")";
    return query;
  }
  function clearValidationErrors() {
    setValidationError("");
  }

  function inputRequired() {
    if(products?.length > 0) {
      return text === "";
    }
    return false;
  }
  function LoadingSkeleton() {
    return (
      <SkeletonText inlineSize='large' />
    );
  }
  async function fetchProducts() {
    
    setLoading(true);
    try {
      const { data  } = await query(
        `query ($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            nodes {
              id
              title
              tags
            }
          }
        }`,
        {
          variables: { first: lines.length, query: searchQuery },
        }
      );
      console.log("products", data)
      setProducts(data.products.nodes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // 2. Check instructions for feature availability, see https://shopify.dev/docs/api/checkout-ui-extensions/apis/cart-instructions for details
  if (!instructions.attributes.canUpdateAttributes) {
    // For checkouts such as draft order invoices, cart attributes may not be allowed
    // Consider rendering a fallback UI or nothing at all, if the feature is unavailable
    return (
      <Banner title="checkout-ui-2" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  
   // Merchants can toggle the `block_progress` capability behavior within the checkout editor
   const canBlockProgress = useExtensionCapability("block_progress");

   // Use the `buyerJourney` intercept to conditionally block checkout progress
   useBuyerJourneyIntercept(({ canBlockProgress }) => {
     // Validate the text field, and that they can complete the purchase
     if (canBlockProgress && inputRequired()) {
       return {
         behavior: "block",
         reason: label + " is required",
         perform: (result) => {
           // If progress can be blocked, then set a validation error on the custom field
           if (result.behavior === "block") {
             setValidationError("Enter " + label + " value");
           }
         },
       };
     }
 
     return {
       behavior: "allow",
       perform: () => {
         // Ensure any errors are hidden
         clearValidationErrors();
       },
     };
   });

  // 3. Render a UI
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!products?.length) {
    return null;
  }

 return  <TextField 
  label={canBlockProgress ? label : label + "(optional)"} 
  value={text || attributeValue || ''}
  onChange={(value) => {
    setText(value);
    inputRequired;
    onInputChange(value);
  }}
  onInput={clearValidationErrors}
  required={canBlockProgress}
  error={validationError}
/>

   // 4. Call the API to modify checkout
   async function onInputChange(value) {
    const result = await applyAttributeChange({
      key: label,
      type: "updateAttribute",
      value: value,
    });
    console.log("applyAttributeChange result", result);
  }
}