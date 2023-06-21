# Accounter

Accounter is a CLI tool that helps you find out what email providers you registered with. It works by connecting to your email accounts using the IMAP protocol and then extracts the domain names of the email addresses that you have in your inbox.

## Prerequisites

- Node.js (version 10 or higher)
- An email account that supports IMAP protocol

## Installation

To use Accounter, you need to have Node.js and npm installed on your machine.

1. Clone the repository

```bash
git clone https://github.com/qnton/accounter.git
```

2. Navigate to the cloned directory

```bash
cd accounter
```

3. Install the dependencies

```bash
npm install
```

## Usage

1. Open a terminal and navigate to the project directory
2. Run `npm run build` to build the tool
3. Run `npm run start` to start the tool
4. Follow the prompts to enter the required information:

   - Email username
   - Email password
   - Email host
   - Port number (default: 993)
   - Use TLS (default: true)
   - Directories to check

5. Wait for the tool to finish scanning your emails
6. The tool will output the domain names of the email providers that you registered with in a JSON file named YYYY-MM-DD_output.json (e.g., 2023-03-08_output.json)

**Note:** The tool only scans the directories that you specify during the setup.
