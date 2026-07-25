import subprocess
import sys
import argparse
import os

def run_slither(target_file):
    """
    Runs Slither static analysis on a given Solidity file.
    """
    if not os.path.exists(target_file):
        print(f"Error: Target file {target_file} not found.")
        sys.exit(1)

    print(f"[*] Starting Slither audit on {target_file}...")
    try:
        # Run slither via subprocess
        result = subprocess.run(
            ["slither", target_file],
            capture_output=True,
            text=True
        )
        
        print("=== AUDIT REPORT ===")
        print(result.stdout)
        
        if result.stderr:
            print("=== WARNINGS / ERRORS ===")
            print(result.stderr)
            
        if result.returncode == 0:
            print("[+] Audit completed successfully. No critical vulnerabilities found that break compilation.")
        else:
            print("[!] Slither detected potential vulnerabilities or compilation errors.")
            
    except FileNotFoundError:
        print("Error: Slither is not installed or not in PATH.")
        print("Please install it using: pip3 install slither-analyzer")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Smart Contract Auditor using Slither")
    parser.add_argument("file", help="Path to the Solidity (.sol) file to audit")
    args = parser.parse_args()
    
    run_slither(args.file)
