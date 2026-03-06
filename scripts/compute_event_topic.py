from hashlib import sha3_256

# Compute keccak256 of the event signature
signatures = [
    "ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)",
    "ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256)",
    "ProposalCandidateUpdated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32,string)",
    "ProposalCandidateCanceled(address,bytes32)",
]

for sig in signatures:
    h = sha3_256(sig.encode()).hexdigest()
    print(f"keccak256('{sig}')")
    print(f"  = 0x{h}")
    print()
