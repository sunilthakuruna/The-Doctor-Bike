# Manufacturer barcode integration

Manufacturer Barcode is optional on Spare Parts; existing Part Code/SKU remains the identity. One code maps to one part. Blank barcode fields remain valid. Barcode text preserves leading zeroes. The server enforces uniqueness, including restore from Recycle Bin.

Scan Barcode appears beside Add Part/Add Item in Job Card, Counter Sale and Purchase forms. A keyboard-style USB/Bluetooth reader or manual text entry followed by Enter selects the matching part through the existing picker. The entry stays open; the user reviews quantity/rate and saves normally. The inventory toolbar also provides barcode lookup.

Unknown and ambiguous codes produce a message and do not create parts or stock. No camera scanner, barcode generation, label printing or sample records are included in production.

Saved-part search matches name, code, manufacturer barcode, brand, vehicle make/model, type and HSN. Its suggestions remain hidden on an empty query and float over other fields. Purchase search also includes these identifying fields.

HSN is required for new parts and changes to identifying master details. Existing legacy parts without HSN remain usable in transactions and can be restored; fill their actual HSN when editing their details. HSN is not a barcode and is not unique.

## D1 / deployment

No SQL migration or database reset is required: barcode is retained inside the existing versioned inventory JSON snapshot. Existing permissions and conflict checking remain active.

Validation: 89 automated tests pass, including a real SQLite test of the inventory API save/reload path, duplicate rejection and concurrent-version rejection. Physical scanner hardware has not been tested. Deploy the commit via the normal production branch workflow, then verify an existing test part barcode and its lookup after reload.
