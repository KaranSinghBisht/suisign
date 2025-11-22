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

    const E_NOT_SIGNER: u64 = 1;
    const E_ALREADY_SIGNED: u64 = 2;
    const E_NOT_OWNER: u64 = 3;

    // existing create_document, sign_document, seal_approve...
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

        transfer::share_object(doc);
    }

    public entry fun sign_document(
        doc: &mut Document,
        clock: &clock::Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        let signer = tx_context::sender(ctx);

        assert!(is_signer(&doc.signers, signer), E_NOT_SIGNER);
        assert!(!has_signed(&doc.signatures, signer), E_ALREADY_SIGNED);

        let ts = clock::timestamp_ms(clock);
        let rec = SignatureRecord { signer, timestamp_ms: ts };

        vector::push_back(&mut doc.signatures, rec);

        if (vector::length(&doc.signatures) == vector::length(&doc.signers)) {
            doc.fully_signed = true;
        };
    }

    /// Seal access-control hook (no-op, used by Seal PTB validation).
    public entry fun seal_approve(_id: vector<u8>, _doc: &mut Document) {}

    /// **NEW**: rotate the Walrus blob for this document.
    ///
    /// - Allowed callers: owner OR any signer on the document.
    /// - Safe to call multiple times; it just overwrites the fields.
    public entry fun update_document_blob(
        doc: &mut Document,
        new_walrus_blob_id: string::String,
        new_walrus_hash_hex: string::String,
        ctx: &mut tx_context::TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(
            sender == doc.owner || is_signer(&doc.signers, sender),
            E_NOT_OWNER
        );

        doc.walrus_blob_id = new_walrus_blob_id;
        doc.walrus_hash_hex = new_walrus_hash_hex;
    }

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
