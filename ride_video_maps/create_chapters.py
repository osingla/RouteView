#!/usr/bin/python

import pdb
import sys
import time
import os

def main():
    L = open("chapters.txt", "r").readlines()

    L2 = []
    i = 0
    for X in L:
        L2.append(X)
        i+=1
        if X == '\n':
            break

    xend=0
    for X in L[i:]:
        if "start=" in X:
            v = int(X[6:8])*3600 + int(X[9:11])*60 + int(X[12:14])
            if v != xend:
                print("Error line {0}: {1}".format(i, X))
                exit(1)
            L2.append("[CHAPTER]\n")
            L2.append("TIMEBASE=1/1000\n")
            L2.append("START={0}\n".format(v*1000+1))
            xstart=v
        elif "end=" in X:
            v = int(X[4:6])*3600 + int(X[7:9])*60 + int(X[10:12])
            xend = v
            L2.append("END={0}\n".format(v*1000))
        elif "title=" in X:
            L2.append("title={0}\n".format(X[6:]))
            L2.append("\n")
        #pdb.set_trace()
        i+=1

    open("FFMETADATAFILE.txt", "w").writelines(L2)

if __name__ == "__main__":
    main()
