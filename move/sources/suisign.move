module suisign::document {
    use std::string;
    use std::vector;
    use sui::clock;
    use sui::object;
    use sui::transfer;
    use sui::tx_context;

    /// A single signature on a document.
    public struct SignatureRecord has copy, drop, store {
        signer: address,
        timestamp_ms: u64,
    }

    /// Core SuiSign document metadata.
    public struct Document has key, store {
        id: object::UID,
        owner: address,
        walrus_blob_id: string::String,
        walrus_hash_hex: string::String,
        /// Base64-encoded Seal encrypted payload containing AES key + IV.
        seal_secret_id: string::String,
        signers: vector<address>,
        signatures: vector<SignatureRecord>,
        fully_signed: bool,
    }

    /// Create a new document and share it so that other signers can call `sign_document`.
    public entry fun create_document(
        walrus_blob_id: string::String,
        walrus_hash_hex: string::String,
        seal_secret_id: string::String,
        signers: vector<address>,
        ctx: &mut tx_context::TxContext,
    ) {
        let owner = tx_context::sender(ctx);

        let doc = Document {
            id: object::new(ctx),
            owner,
            walrus_blob_id,
            walrus_hash_hex,
            seal_secret_id,
            signers,
            signatures: vector::empty<SignatureRecord>(),
            fully_signed: false,
        };

        // Make the Document a shared object so all signers can call `sign_document`.
        transfer::share_object(doc);
    }

    /// Sign an existing shared document.
    ///
    /// Requirements:
    ///  - caller must be in `signers`
    ///  - caller must not have signed before
    public entry fun sign_document(
        doc: &mut Document,
        clock: &clock::Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        let signer = tx_context::sender(ctx);

        // Error codes:
        // 1 = not an allowed signer
        // 2 = already signed
        assert!(is_signer(&doc.signers, signer), 1);
        assert!(!has_signed(&doc.signatures, signer), 2);

        let ts = clock::timestamp_ms(clock);
        let rec = SignatureRecord { signer, timestamp_ms: ts };

        vector::push_back(&mut doc.signatures, rec);

        if (vector::length(&doc.signatures) == vector::length(&doc.signers)) {
            doc.fully_signed = true;
        };
    }

    /// Seal access-control hook.
    /// For now the function is a no-op; Seal only needs it to exist with this
    /// name and signature to validate the PTB.
    public entry fun seal_approve(_id: vector<u8>, _doc: &mut Document) {}

    /// Check if an address is in the allowed signers list.
    fun is_signer(signers: &vector<address>, addr: address): bool {
        let mut i = 0;
        let len = vector::length(signers);
        while (i < len) {
            let s = *vector::borrow(signers, i);
            if (s == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Check if an address has already signed.
    fun has_signed(sigs: &vector<SignatureRecord>, addr: address): bool {
        let mut i = 0;
        let len = vector::length(sigs);
        while (i < len) {
            let s = vector::borrow(sigs, i);
            if (s.signer == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }
}
